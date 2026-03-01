import { z } from "zod";

const dateString = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Invalid date format",
});

export const listInvoicesQuerySchema = z.object({
    party_id: z.string().uuid().optional(),
    payment_status: z.enum(["unpaid", "partial", "paid", "overdue"]).optional(),
    invoice_type: z.enum(["sales", "purchase", "credit_note", "debit_note"]).optional(),
    from_date: dateString.optional(),
    to_date: dateString.optional(),
    search: z.string().min(1).max(100).optional(),
    include_cancelled: z
        .union([z.literal("true"), z.literal("false")])
        .optional()
        .transform((value) => value === "true"),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const cancelInvoiceSchema = z.object({
    cancel_reason: z.string().min(3).max(500).optional(),
});

export const invoicePdfQuerySchema = z.object({
    template: z.enum(["classic", "modern", "compact", "bill_pro", "bill_pro_legacy"]).optional(),
});
