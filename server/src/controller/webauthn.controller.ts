import type { Request, Response } from "express";
import type {
    PublicKeyCredentialCreationOptionsJSON,
    PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";
import { AppError } from "../utils/appError";
import { ERROR_CODES } from "../constants/errorCodes";
import { sendSuccess } from "../utils/responseHandler";
import { userRepository } from "../repository/user.repository";
import { webauthnRepository } from "../repository/webauthn.repository";
import { webauthnService } from "../services/webauthn.service";
import { authService } from "../services/auth.service";
import { setAuthCookies } from "../utils/authCookies";
import type {
    BeginPasskeyAuthenticationInput,
    VerifyPasskeyAuthenticationInput,
    VerifyPasskeyRegistrationInput,
} from "../types/webauthn";

const isEmail = (value: string) => value.includes("@");

const findUserForIdentifier = async (identifier: string) => {
    return isEmail(identifier)
        ? userRepository.findByEmail(identifier)
        : userRepository.findByPhone(identifier);
};

const ensureAuthUserId = (req: Request) => {
    if (!req.user?.id) {
        throw new AppError("Authentication required", 401, ERROR_CODES.UNAUTHORIZED);
    }
    return req.user.id;
};

export const beginPasskeyRegistration = async (req: Request, res: Response) => {
    const userId = ensureAuthUserId(req);
    const user = await userRepository.findById(userId);
    if (!user) {
        throw new AppError("User not found", 404, ERROR_CODES.USER_NOT_FOUND);
    }

    const credentials = await webauthnRepository.listCredentialsByUser(userId);
    const options = await webauthnService.generateRegistrationOptions(user, credentials);

    await webauthnRepository.deleteChallengesForUser(userId, "registration");
    await webauthnRepository.createChallenge({
        userId,
        challenge: options.challenge,
        challengeType: "registration",
        expiresAt: new Date(Date.now() + webauthnService.challengeTtlMs),
    });

    return sendSuccess(res, {
        message: "Passkey registration options generated",
        data: { options },
    });
};

export const verifyPasskeyRegistration = async (
    req: Request<{}, unknown, VerifyPasskeyRegistrationInput>,
    res: Response
) => {
    const userId = ensureAuthUserId(req);
    const challenge = await webauthnRepository.findActiveChallengeForUser(userId, "registration");
    if (!challenge) {
        throw new AppError("Registration challenge expired. Please try again.", 400, ERROR_CODES.BAD_REQUEST);
    }

    const verification = await webauthnService.verifyRegistration({
        response: req.body.response,
        expectedChallenge: challenge.challenge,
    });

    if (!verification.verified || !verification.registrationInfo) {
        throw new AppError("Passkey registration could not be verified", 400, ERROR_CODES.BAD_REQUEST);
    }

    await webauthnRepository.deleteChallengesForUser(userId, "registration");

    const transports = req.body.response.response.transports ?? [];
    const credential = await webauthnRepository.createCredential({
        userId,
        credentialId: verification.registrationInfo.credential.id,
        publicKey: webauthnService.serializePublicKey(verification.registrationInfo.credential.publicKey),
        counter: verification.registrationInfo.credential.counter,
        transports,
        credentialDeviceType: verification.registrationInfo.credentialDeviceType,
        credentialBackedUp: verification.registrationInfo.credentialBackedUp,
        label: req.body.label?.trim() || webauthnService.getDefaultPasskeyLabel(transports),
    });

    return sendSuccess(res, {
        statusCode: 201,
        message: "Passkey registered successfully",
        data: {
            credential: {
                credential_id: credential.credential_id,
                label: credential.label,
                transports: credential.transports,
                credential_device_type: credential.credential_device_type,
                credential_backed_up: credential.credential_backed_up,
                last_used_at: credential.last_used_at,
                created_at: credential.created_at,
            },
        },
    });
};

export const beginPasskeyAuthentication = async (
    req: Request<{}, unknown, BeginPasskeyAuthenticationInput>,
    res: Response
) => {
    const user = await findUserForIdentifier(req.body.identifier);
    if (!user) {
        throw new AppError("No passkeys registered for this account", 404, ERROR_CODES.NOT_FOUND);
    }

    const credentials = await webauthnRepository.listCredentialsByUser(user.id);
    if (credentials.length === 0) {
        throw new AppError("No passkeys registered for this account", 404, ERROR_CODES.NOT_FOUND);
    }

    const options = await webauthnService.generateAuthenticationOptions(credentials);
    await webauthnRepository.deleteChallengesForUser(user.id, "authentication");
    await webauthnRepository.createChallenge({
        userId: user.id,
        challenge: options.challenge,
        challengeType: "authentication",
        expiresAt: new Date(Date.now() + webauthnService.challengeTtlMs),
    });

    return sendSuccess(res, {
        message: "Passkey authentication options generated",
        data: { options },
    });
};

export const verifyPasskeyAuthentication = async (
    req: Request<{}, unknown, VerifyPasskeyAuthenticationInput>,
    res: Response
) => {
    const user = await findUserForIdentifier(req.body.identifier);
    if (!user) {
        throw new AppError("Invalid passkey login request", 401, ERROR_CODES.INVALID_CREDENTIALS);
    }

    const challenge = await webauthnRepository.findActiveChallengeForUser(user.id, "authentication");
    if (!challenge) {
        throw new AppError("Authentication challenge expired. Please try again.", 400, ERROR_CODES.BAD_REQUEST);
    }

    const credential = await webauthnRepository.findCredentialByCredentialId(req.body.response.id);
    if (!credential || credential.user_id !== user.id) {
        throw new AppError("Passkey not recognized for this account", 401, ERROR_CODES.INVALID_CREDENTIALS);
    }

    const verification = await webauthnService.verifyAuthentication({
        response: req.body.response,
        expectedChallenge: challenge.challenge,
        credential,
    });

    if (!verification.verified) {
        throw new AppError("Passkey authentication failed", 401, ERROR_CODES.INVALID_CREDENTIALS);
    }

    await webauthnRepository.deleteChallengesForUser(user.id, "authentication");
    await webauthnRepository.updateCredentialUsage(credential.credential_id, {
        counter: verification.authenticationInfo.newCounter,
        credentialDeviceType: verification.authenticationInfo.credentialDeviceType,
        credentialBackedUp: verification.authenticationInfo.credentialBackedUp,
    });

    const tokens = await authService.generateTokensForUserSession({
        userId: user.id,
        businessId: req.body.business_id,
    });
    setAuthCookies(res, tokens);

    const publicUser = await userRepository.findById(user.id);
    if (!publicUser) {
        throw new AppError("User not found", 404, ERROR_CODES.USER_NOT_FOUND);
    }

    return sendSuccess(res, {
        message: "Passkey login successful",
        data: {
            user: publicUser,
            tokens,
            session: {
                business_id: req.body.business_id ?? null,
                role: req.body.business_id
                    ? (await userRepository.getBusinessMemberRole(req.body.business_id, user.id)) ?? null
                    : null,
            },
        },
    });
};

export const listPasskeys = async (req: Request, res: Response) => {
    const userId = ensureAuthUserId(req);
    const credentials = await webauthnRepository.listCredentialsByUser(userId);

    return sendSuccess(res, {
        data: credentials.map((credential) => ({
            credential_id: credential.credential_id,
            label: credential.label,
            transports: credential.transports,
            credential_device_type: credential.credential_device_type,
            credential_backed_up: credential.credential_backed_up,
            last_used_at: credential.last_used_at,
            created_at: credential.created_at,
        })),
    });
};

export const deletePasskey = async (req: Request<{ credential_id: string }>, res: Response) => {
    const userId = ensureAuthUserId(req);
    const credentialId = req.params.credential_id;
    if (!credentialId) {
        throw new AppError("Credential ID is required", 400, ERROR_CODES.BAD_REQUEST);
    }

    const deleted = await webauthnRepository.deleteCredentialByCredentialId(userId, credentialId);
    if (!deleted) {
        throw new AppError("Passkey not found", 404, ERROR_CODES.NOT_FOUND);
    }

    return sendSuccess(res, {
        message: "Passkey removed successfully",
    });
};
