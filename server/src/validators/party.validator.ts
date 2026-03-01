import { z } from "zod";

export const createPartySchema = z.object({
    name: z.string().min(2).max(150),
    party_type: z.enum(["customer", "supplier", "both"]),
    gstin: z.string().max(100).optional(),
    pan: z.string().max(10).optional(),
    state_code: z.string().length(2).optional(),
    state: z.string().max(100).optional(),
    address: z.string().optional(),
    city: z.string().max(100).optional(),
    pincode: z.string().max(10).optional(),
    phone: z.string().max(15).optional(),
    email: z.string().email().max(100).optional(),
    opening_balance: z.number().nonnegative().optional(),
    opening_balance_type: z.enum(["receivable", "payable", "none"]).optional(),
    notes: z.string().optional(),
});

export const updatePartySchema = createPartySchema
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
        message: "At least one field is required",
    });
