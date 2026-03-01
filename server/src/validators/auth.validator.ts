import { z } from "zod";

export const signupSchema = z.object({
    name: z.string().min(2).max(255),
    email: z.string().email().max(255),
    phone: z.string().min(8).max(20),
    password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
    identifier: z.string().min(3),
    password: z.string().min(1),
    business_id: z.string().uuid().optional(),
});

export const updateProfileSchema = z
    .object({
        name: z.string().min(2).max(255).optional(),
        email: z.string().email().max(255).optional(),
        phone: z.string().min(8).max(20).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field is required",
    });

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128),
});

export const switchBusinessSchema = z.object({
    business_id: z.string().uuid(),
});
