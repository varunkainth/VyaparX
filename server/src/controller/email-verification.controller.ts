import type { Request, Response } from "express";
import crypto from "crypto";
import { emailService } from "../config/email";
import { emailVerificationRepository } from "../repository/email-verification.repository";
import { userRepository } from "../repository/user.repository";
import { sendSuccess } from "../utils/responseHandler";
import { AppError } from "../utils/appError";
import { ERROR_CODES } from "../constants/errorCodes";
import env from "../config/env";

const generateOpaqueToken = () => crypto.randomBytes(32).toString("hex");

interface SendVerificationEmailBody {
  email: string;
}

interface VerifyEmailBody {
  token: string;
}

export async function sendVerificationEmailHandler(
  req: Request<{}, {}, SendVerificationEmailBody>,
  res: Response,
) {
  const { email } = req.body;

  // Check if email service is configured
  if (!emailService.isReady()) {
    throw new AppError(
      "Email service is not configured. Please contact administrator.",
      503,
      ERROR_CODES.BAD_REQUEST,
    );
  }

  // Find user by email
  const user = await userRepository.findByEmail(email);

  if (!user) {
    throw new AppError("User not found", 404, ERROR_CODES.USER_NOT_FOUND);
  }

  // Check if already verified
  if (user.is_verified) {
    return sendSuccess(res, {
      message: "Email is already verified",
      data: { email },
    });
  }

  // Generate secure random token
  const verificationToken = generateOpaqueToken();

  // Token expires in 24 hours
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Delete any existing tokens for this user
  await emailVerificationRepository.deleteUserTokens(user.id);

  // Save verification token
  await emailVerificationRepository.createVerificationToken(
    user.id,
    verificationToken,
    expiresAt,
  );

  // Create verification URL
  const frontendUrl = env.FRONTEND_URL || "http://localhost:3000";
  const verificationUrl = `${frontendUrl}/verify-email?token=${encodeURIComponent(verificationToken)}`;

  // Send email with timeout
  try {
    const emailPromise = emailService.sendVerificationEmail({
      to: user.email,
      name: user.name,
      verificationToken,
      verificationUrl,
    });

    // Add 10 second timeout for email sending
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Email sending timeout")), 10000);
    });

    await Promise.race([emailPromise, timeoutPromise]);
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new AppError(
      "Failed to send verification email. Please try again later.",
      500,
      ERROR_CODES.INTERNAL_ERROR,
    );
  }

  return sendSuccess(res, {
    message: "Verification email sent successfully",
    data: { email },
  });
}

export async function verifyEmailHandler(
  req: Request<{}, {}, VerifyEmailBody>,
  res: Response,
) {
  const { token } = req.body;

  // Find and validate token
  const verificationToken =
    await emailVerificationRepository.findValidToken(token);

  if (!verificationToken) {
    throw new AppError(
      "Invalid or expired verification token",
      400,
      ERROR_CODES.BAD_REQUEST,
    );
  }

  // Check if already verified
  if (verificationToken.is_verified) {
    return sendSuccess(res, {
      message: "Email is already verified",
      data: {
        email: verificationToken.email,
      },
    });
  }

  // Mark user as verified
  await userRepository.markVerified(verificationToken.user_id);

  // Mark token as used
  await emailVerificationRepository.markTokenAsVerified(token);

  return sendSuccess(res, {
    message: "Email verified successfully. You can now login.",
    data: {
      email: verificationToken.email,
      name: verificationToken.name,
    },
  });
}

export async function resendVerificationEmailHandler(
  req: Request,
  res: Response,
) {
  const userId = req.user!.id;

  // Check if email service is configured
  if (!emailService.isReady()) {
    throw new AppError(
      "Email service is not configured. Please contact administrator.",
      503,
      ERROR_CODES.BAD_REQUEST,
    );
  }

  // Get user
  const user = await userRepository.findById(userId);

  if (!user) {
    throw new AppError("User not found", 404, ERROR_CODES.USER_NOT_FOUND);
  }

  // Check if already verified
  if (user.is_verified) {
    return sendSuccess(res, {
      message: "Email is already verified",
      data: { email: user.email },
    });
  }

  // Check if a recent token exists (prevent spam) - skip in development
  const isDevelopment = process.env.NODE_ENV === "development";

  if (!isDevelopment) {
    const latestToken =
      await emailVerificationRepository.getLatestToken(userId);
    if (latestToken) {
      const timeSinceLastToken =
        Date.now() - new Date(latestToken.created_at).getTime();
      const cooldownMs = 300 * 1000;

      if (timeSinceLastToken < cooldownMs) {
        const secondsRemaining = Math.ceil(
          (cooldownMs - timeSinceLastToken) / 1000,
        );
        throw new AppError(
          `Please wait ${secondsRemaining} seconds before requesting another verification email`,
          429,
          ERROR_CODES.BAD_REQUEST,
        );
      }
    }
  }

  // Generate new token
  const verificationToken = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Delete old tokens
  await emailVerificationRepository.deleteUserTokens(userId);

  // Save new token
  await emailVerificationRepository.createVerificationToken(
    userId,
    verificationToken,
    expiresAt,
  );

  // Create verification URL
  const frontendUrl = env.FRONTEND_URL || "http://localhost:3000";
  const verificationUrl = `${frontendUrl}/verify-email?token=${encodeURIComponent(verificationToken)}`;

  // Send email
  try {
    const emailPromise = emailService.sendVerificationEmail({
      to: user.email,
      name: user.name,
      verificationToken,
      verificationUrl,
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Email sending timeout")), 10000);
    });

    await Promise.race([emailPromise, timeoutPromise]);
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new AppError(
      "Failed to send verification email. Please try again later.",
      500,
      ERROR_CODES.INTERNAL_ERROR,
    );
  }

  return sendSuccess(res, {
    message: "Verification email sent successfully",
    data: { email: user.email },
  });
}
