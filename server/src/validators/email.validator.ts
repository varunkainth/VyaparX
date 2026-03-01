import { z } from "zod";

export const sendInvoiceEmailSchema = z.object({
    recipient_email: z
        .string()
        .email("Invalid email address")
        .min(1, "Recipient email is required"),
});

export const testEmailSchema = z.object({
    test_email: z.string().email("Invalid email address").optional(),
});
