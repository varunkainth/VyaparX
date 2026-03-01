import { z } from "zod";

const dateString = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Invalid date format",
});

export const ledgerStatementQuerySchema = z.object({
    party_id: z.string().uuid().optional(),
    from_date: dateString.optional(),
    to_date: dateString.optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
});
