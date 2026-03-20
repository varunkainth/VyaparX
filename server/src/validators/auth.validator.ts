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

export const beginPasskeyAuthenticationSchema = z.object({
    identifier: z.string().min(3),
});

const registrationResponseSchema = z.object({
    id: z.string().min(1),
    rawId: z.string().min(1),
    type: z.literal("public-key"),
    authenticatorAttachment: z.string().optional(),
    clientExtensionResults: z.record(z.string(), z.unknown()),
    response: z.object({
        clientDataJSON: z.string().min(1),
        attestationObject: z.string().min(1),
        authenticatorData: z.string().optional(),
        transports: z.array(z.string()).optional(),
        publicKeyAlgorithm: z.number().optional(),
        publicKey: z.string().optional(),
    }),
});

const authenticationResponseSchema = z.object({
    id: z.string().min(1),
    rawId: z.string().min(1),
    type: z.literal("public-key"),
    authenticatorAttachment: z.string().optional(),
    clientExtensionResults: z.record(z.string(), z.unknown()),
    response: z.object({
        clientDataJSON: z.string().min(1),
        authenticatorData: z.string().min(1),
        signature: z.string().min(1),
        userHandle: z.string().optional(),
    }),
});

export const verifyPasskeyRegistrationSchema = z.object({
    response: registrationResponseSchema,
    label: z.string().trim().min(1).max(255).optional(),
});

export const verifyPasskeyAuthenticationSchema = z.object({
    identifier: z.string().min(3),
    response: authenticationResponseSchema,
    business_id: z.string().uuid().optional(),
});
