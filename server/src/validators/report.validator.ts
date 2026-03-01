import { z } from "zod";

const dateString = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Invalid date format",
});

export const dateRangeQuerySchema = z.object({
    from_date: dateString.optional(),
    to_date: dateString.optional(),
});

export const gstSummaryQuerySchema = dateRangeQuerySchema.extend({
    invoice_type: z.enum(["sales", "purchase", "credit_note", "debit_note"]).optional(),
});

export const exportFormatSchema = z.object({
    format: z.enum(["csv", "excel"]).optional().default("csv"),
});

export const dateRangeExportQuerySchema = dateRangeQuerySchema.merge(exportFormatSchema);

export const gstSummaryExportQuerySchema = gstSummaryQuerySchema.merge(exportFormatSchema);
