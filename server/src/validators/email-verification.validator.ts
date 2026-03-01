import { z } from "zod";

export const sendVerificationEmailSchema = z.object({
    email: z
        .string()
        .email("Invalid email address")
        .min(1, "Email is required"),
});

export const verifyEmailSchema = z.object({
    token: z
        .string()
        .min(1, "Token is required"),
});
