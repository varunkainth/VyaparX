import type { Request, Response } from "express";
import crypto from "crypto";
import { userRepository } from "../repository/user.repository";
import { refreshTokenRepository } from "../repository/refreshToken.repository";
import { emailVerificationRepository } from "../repository/email-verification.repository";
import { authService } from "../services/auth.service";
import { emailService } from "../config/email";
import type {
    ChangePasswordInput,
    LoginInput,
    SignupInput,
    SwitchBusinessInput,
} from "../types/auth";
import { AppError } from "../utils/appError";
import { clearAuthCookies, setAuthCookies } from "../utils/authCookies";
import { sendSuccess } from "../utils/responseHandler";
import { ERROR_CODES } from "../constants/errorCodes";
import env from "../config/env";

const isEmail = (value: string) => value.includes("@");
const generateOpaqueToken = () => crypto.randomBytes(32).toString("hex");

export const signup = async (req: Request<{}, unknown, SignupInput>, res: Response) => {
    const { name, email, phone, password } = req.body;

    const existingByEmail = await userRepository.findByEmail(email);
    if (existingByEmail) {
        throw new AppError("Email already in use", 409, ERROR_CODES.EMAIL_CONFLICT);
    }

    const existingByPhone = await userRepository.findByPhone(phone);
    if (existingByPhone) {
        throw new AppError("Phone already in use", 409, ERROR_CODES.PHONE_CONFLICT);
    }

    const password_hash = await authService.hashPassword(password);
    const user = await userRepository.createUser({ name, email, phone, password_hash });
    const tokens = await authService.generateTokensForUserSession({ userId: user.id });
    setAuthCookies(res, tokens);

    // Send verification email (don't block signup if email fails)
    if (emailService.isReady()) {
        try {
            const verificationToken = generateOpaqueToken();
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
            
            await emailVerificationRepository.createVerificationToken(user.id, verificationToken, expiresAt);
            
            const frontendUrl = env.FRONTEND_URL || "http://localhost:3000";
            const verificationUrl = `${frontendUrl}/verify-email#token=${encodeURIComponent(verificationToken)}`;
            
            const emailPromise = emailService.sendVerificationEmail({
                to: email,
                name,
                verificationToken,
                verificationUrl,
            });
            
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error("Email timeout")), 10000);
            });
            
            await Promise.race([emailPromise, timeoutPromise]);
        } catch (error) {
            console.error("Failed to send verification email:", error);
            // Don't fail signup if email fails
        }
    }

    return sendSuccess(res, {
        statusCode: 201,
        message: "Signup successful",
        data: {
            user,
            tokens,
            session: {
                business_id: null,
                role: null,
            },
        },
    });
};

export const login = async (req: Request<{}, unknown, LoginInput>, res: Response) => {
    const { identifier, password, business_id } = req.body;

    const user = isEmail(identifier)
        ? await userRepository.findByEmail(identifier)
        : await userRepository.findByPhone(identifier);

    if (!user) {
        throw new AppError("Invalid credentials", 401, ERROR_CODES.INVALID_CREDENTIALS);
    }

    const isValidPassword = await authService.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
        throw new AppError("Invalid credentials", 401, ERROR_CODES.INVALID_CREDENTIALS);
    }

    const tokens = await authService.generateTokensForUserSession({
        userId: user.id,
        businessId: business_id,
    });
    setAuthCookies(res, tokens);

    const { password_hash: _passwordHash, ...publicUser } = user;
    return sendSuccess(res, {
        message: "Login successful",
        data: {
            user: publicUser,
            tokens,
            session: {
                business_id: business_id ?? null,
                role: business_id ? (await userRepository.getBusinessMemberRole(business_id, user.id)) ?? null : null,
            },
        },
    });
};

export const refreshToken = async (req: Request, res: Response) => {
    if (!req.user?.id || !req.authToken) {
        throw new AppError("Authentication required", 401, ERROR_CODES.UNAUTHORIZED);
    }

    const tokens = await authService.rotateRefreshTokenSession(req.authToken);
    setAuthCookies(res, tokens);

    return sendSuccess(res, {
        message: "Token refreshed",
        data: { tokens },
    });
};

export const me = async (req: Request, res: Response) => {
    if (!req.user?.id) {
        throw new AppError("Authentication required", 401, ERROR_CODES.UNAUTHORIZED);
    }

    const user = await userRepository.findById(req.user.id);
    if (!user) {
        throw new AppError("User not found", 404, ERROR_CODES.USER_NOT_FOUND);
    }

    let role = req.user.role;
    if (req.user.business_id) {
        role = await userRepository.getBusinessMemberRole(req.user.business_id, req.user.id) ?? undefined;
    }

    return sendSuccess(res, {
        data: {
            user,
            session: {
                business_id: req.user.business_id ?? null,
                role: role ?? null,
            },
        },
    });
};

export const updateMe = async (req: Request, res: Response) => {
    if (!req.user?.id) {
        throw new AppError("Authentication required", 401, ERROR_CODES.UNAUTHORIZED);
    }

    const updated = await userRepository.updateUser(req.user.id, req.body);
    if (!updated) {
        throw new AppError("User not found or no changes provided", 404, ERROR_CODES.USER_NOT_FOUND);
    }

    return sendSuccess(res, {
        message: "Profile updated",
        data: { user: updated },
    });
};

export const changePassword = async (req: Request<{}, unknown, ChangePasswordInput>, res: Response) => {
    if (!req.user?.id) {
        throw new AppError("Authentication required", 401, ERROR_CODES.UNAUTHORIZED);
    }

    const { currentPassword, newPassword } = req.body;

    const user = await userRepository.findAuthById(req.user.id);
    if (!user) {
        throw new AppError("User not found", 404, ERROR_CODES.USER_NOT_FOUND);
    }

    const isValidPassword = await authService.verifyPassword(currentPassword, user.password_hash);
    if (!isValidPassword) {
        throw new AppError("Current password is incorrect", 401, ERROR_CODES.INVALID_CREDENTIALS);
    }

    const newHash = await authService.hashPassword(newPassword);
    await userRepository.updatePassword(req.user.id, newHash);
    clearAuthCookies(res);

    return sendSuccess(res, {
        message: "Password changed successfully. Please login again.",
    });
};

export const logout = async (req: Request, res: Response) => {
    if (!req.user?.id) {
        throw new AppError("Authentication required", 401, ERROR_CODES.UNAUTHORIZED);
    }

    await refreshTokenRepository.revokeAllForUser(req.user.id);
    await userRepository.incrementTokenVersion(req.user.id);
    clearAuthCookies(res);
    return sendSuccess(res, { message: "Logged out successfully" });
};

export const switchBusiness = async (req: Request<{}, unknown, SwitchBusinessInput>, res: Response) => {
    if (!req.user?.id) {
        throw new AppError("Authentication required", 401, ERROR_CODES.UNAUTHORIZED);
    }

    const { business_id } = req.body;
    const role = await userRepository.getBusinessMemberRole(business_id, req.user.id);

    if (!role) {
        throw new AppError(
            "You are not an active member of this business",
            403,
            ERROR_CODES.BUSINESS_ACCESS_DENIED
        );
    }

    const tokens = await authService.generateTokensForUserSession({
        userId: req.user.id,
        businessId: business_id,
    });
    setAuthCookies(res, tokens);

    return sendSuccess(res, {
        message: "Business switched successfully",
        data: {
            tokens,
            session: { business_id, role },
        },
    });
};
