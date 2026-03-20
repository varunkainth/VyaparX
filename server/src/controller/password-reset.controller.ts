import type { Request, Response } from "express";
import crypto from "crypto";
import { emailService } from "../config/email";
import { authService } from "../services/auth.service";
import { passwordResetRepository } from "../repository/password-reset.repository";
import { userRepository } from "../repository/user.repository";
import { sendSuccess } from "../utils/responseHandler";
import { AppError } from "../utils/appError";
import { ERROR_CODES } from "../constants/errorCodes";

const generateOpaqueToken = () => crypto.randomBytes(32).toString("hex");

interface ForgotPasswordBody {
    email: string;
}

interface ResetPasswordBody {
    token: string;
    new_password: string;
}

interface VerifyTokenBody {
    token: string;
}

export async function forgotPasswordHandler(
    req: Request<{}, {}, ForgotPasswordBody>,
    res: Response
) {
    const { email } = req.body;

    // Check if email service is configured
    if (!emailService.isReady()) {
        throw new AppError(
            "Email service is not configured. Please contact administrator.",
            503,
            ERROR_CODES.BAD_REQUEST
        );
    }

    // Find user by email
    const user = await userRepository.findByEmail(email);
    
    // Always return success even if user doesn't exist (security best practice)
    // This prevents email enumeration attacks
    if (!user) {
        return sendSuccess(res, {
            message: "If an account with that email exists, a password reset link has been sent.",
            data: { email },
        });
    }

    // Generate secure random token
    const resetToken = generateOpaqueToken();
    
    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Delete any existing tokens for this user
    await passwordResetRepository.deleteUserTokens(user.id);

    // Save reset token
    await passwordResetRepository.createResetToken(user.id, resetToken, expiresAt);

    // Create reset URL
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetUrl = `${frontendUrl}/reset-password#token=${encodeURIComponent(resetToken)}`;

    // Send email with timeout
    try {
        const emailPromise = emailService.sendPasswordResetEmail({
            to: user.email,
            name: user.name,
            resetToken,
            resetUrl,
        });

        // Add 10 second timeout for email sending
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Email sending timeout")), 10000);
        });

        await Promise.race([emailPromise, timeoutPromise]);
    } catch (error) {
        console.error("Error sending password reset email:", error);
        // Don't throw error to user - still return success for security
        // But log the error for debugging
    }

    return sendSuccess(res, {
        message: "If an account with that email exists, a password reset link has been sent.",
        data: { email },
    });
}

export async function verifyResetTokenHandler(
    req: Request<{}, {}, VerifyTokenBody>,
    res: Response
) {
    const { token } = req.body;

    const resetToken = await passwordResetRepository.findValidToken(token);

    if (!resetToken) {
        throw new AppError(
            "Invalid or expired reset token",
            400,
            ERROR_CODES.BAD_REQUEST
        );
    }

    return sendSuccess(res, {
        message: "Token is valid",
        data: {
            email: resetToken.email,
            name: resetToken.name,
        },
    });
}

export async function resetPasswordHandler(
    req: Request<{}, {}, ResetPasswordBody>,
    res: Response
) {
    const { token, new_password } = req.body;

    // Verify token
    const resetToken = await passwordResetRepository.findValidToken(token);

    if (!resetToken) {
        throw new AppError(
            "Invalid or expired reset token",
            400,
            ERROR_CODES.BAD_REQUEST
        );
    }

    // Hash new password
    const hashedPassword = await authService.hashPassword(new_password);

    // Update user password
    await userRepository.updatePassword(resetToken.user_id, hashedPassword);

    // Mark token as used
    await passwordResetRepository.markTokenAsUsed(token);

    return sendSuccess(res, {
        message: "Password reset successfully. You can now login with your new password.",
        data: {
            email: resetToken.email,
        },
    });
}
