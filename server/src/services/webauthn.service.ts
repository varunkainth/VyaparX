import {
    generateAuthenticationOptions,
    generateRegistrationOptions,
    verifyAuthenticationResponse,
    verifyRegistrationResponse,
    type AuthenticationResponseJSON,
    type AuthenticatorTransportFuture,
    type RegistrationResponseJSON,
    type Uint8Array_,
    type WebAuthnCredential,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import env from "../config/env";
import type { PublicUser } from "../types/user";
import type { WebAuthnCredentialRecord } from "../types/webauthn";

const challengeTtlMs = 10 * 60 * 1000;

const getDefaultPasskeyLabel = (transports: AuthenticatorTransportFuture[] = []) => {
    if (transports.includes("internal")) {
        return "Device Passkey";
    }
    if (transports.includes("usb") || transports.includes("nfc") || transports.includes("smart-card")) {
        return "Security Key";
    }
    return "Passkey";
};

const toWebAuthnCredential = (credential: WebAuthnCredentialRecord): WebAuthnCredential => ({
    id: credential.credential_id,
    publicKey: isoBase64URL.toBuffer(credential.public_key),
    counter: credential.counter,
    transports: credential.transports,
});

const userIdToBytes = (userId: string) => new TextEncoder().encode(userId);

export const webauthnService = {
    challengeTtlMs,

    async generateRegistrationOptions(user: PublicUser, credentials: WebAuthnCredentialRecord[]) {
        return generateRegistrationOptions({
            rpName: env.WEBAUTHN_RP_NAME,
            rpID: env.WEBAUTHN_RP_ID,
            userName: user.email,
            userID: userIdToBytes(user.id),
            userDisplayName: user.name,
            attestationType: "none",
            excludeCredentials: credentials.map((credential) => ({
                id: credential.credential_id,
                transports: credential.transports,
            })),
            authenticatorSelection: {
                residentKey: "preferred",
                userVerification: "preferred",
            },
        });
    },

    async verifyRegistration(params: {
        response: RegistrationResponseJSON;
        expectedChallenge: string;
    }) {
        return verifyRegistrationResponse({
            response: params.response,
            expectedChallenge: params.expectedChallenge,
            expectedOrigin: env.WEBAUTHN_ORIGIN,
            expectedRPID: env.WEBAUTHN_RP_ID,
            requireUserVerification: true,
        });
    },

    async generateAuthenticationOptions(credentials: WebAuthnCredentialRecord[]) {
        return generateAuthenticationOptions({
            rpID: env.WEBAUTHN_RP_ID,
            allowCredentials: credentials.map((credential) => ({
                id: credential.credential_id,
                transports: credential.transports,
            })),
            userVerification: "preferred",
        });
    },

    async verifyAuthentication(params: {
        response: AuthenticationResponseJSON;
        expectedChallenge: string;
        credential: WebAuthnCredentialRecord;
    }) {
        return verifyAuthenticationResponse({
            response: params.response,
            expectedChallenge: params.expectedChallenge,
            expectedOrigin: env.WEBAUTHN_ORIGIN,
            expectedRPID: env.WEBAUTHN_RP_ID,
            credential: toWebAuthnCredential(params.credential),
            requireUserVerification: true,
        });
    },

    serializePublicKey(publicKey: Uint8Array_) {
        return isoBase64URL.fromBuffer(publicKey);
    },

    getDefaultPasskeyLabel,
};
