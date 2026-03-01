import { z } from "zod";

const dateString = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Invalid date format",
});

export const listPaymentsQuerySchema = z.object({
    party_id: z.string().uuid().optional(),
    payment_type: z.enum(["received", "made"]).optional(),
    payment_mode: z.enum(["cash", "bank_transfer", "upi", "card", "cheque", "other"]).optional(),
    is_reconciled: z
        .union([z.literal("true"), z.literal("false")])
        .optional()
        .transform((value) => {
            if (value === undefined) return undefined;
            return value === "true";
        }),
    from_date: dateString.optional(),
    to_date: dateString.optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const reconcilePaymentSchema = z.object({
    bank_statement_date: dateString.optional(),
    bank_ref_no: z.string().max(100).optional(),
    notes: z.string().max(500).optional(),
});
