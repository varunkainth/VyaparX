import { z } from "zod";

export const forgotPasswordSchema = z.object({
    email: z
        .string()
        .email("Invalid email address")
        .min(1, "Email is required"),
});

export const verifyTokenSchema = z.object({
    token: z
        .string()
        .min(1, "Token is required"),
});

export const resetPasswordSchema = z.object({
    token: z
        .string()
        .min(1, "Token is required"),
    new_password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(100, "Password must be less than 100 characters")
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            "Password must contain at least one uppercase letter, one lowercase letter, and one number"
        ),
});
