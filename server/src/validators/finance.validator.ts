import { z } from "zod";

const dateString = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Invalid date format",
});

const invoiceItemSchema = z.object({
    item_id: z.string().uuid().optional(),
    item_name: z.string().min(1).max(200),
    hsn_code: z.string().max(8).optional(),
    unit: z.string().min(1).max(20),
    quantity: z.number().positive(),
    unit_price: z.number().nonnegative(),
    discount_pct: z.number().nonnegative().max(100),
    price_mode: z.enum(["exclusive", "inclusive"]),
    taxable_value: z.number().nonnegative(),
    gst_rate: z.number().nonnegative(),
    cgst_rate: z.number().nonnegative(),
    sgst_rate: z.number().nonnegative(),
    igst_rate: z.number().nonnegative(),
    cgst_amount: z.number().nonnegative(),
    sgst_amount: z.number().nonnegative(),
    igst_amount: z.number().nonnegative(),
    total_amount: z.number().nonnegative(),
});

const invoiceBaseSchema = z.object({
    party_id: z.string().uuid(),
    invoice_date: dateString,
    place_of_supply: z.string().length(2),
    is_igst: z.boolean(),
    items: z.array(invoiceItemSchema).min(1),
    subtotal: z.number().nonnegative(),
    taxable_amount: z.number().nonnegative(),
    total_tax: z.number().nonnegative(),
    round_off: z.number().min(-1).max(1).optional(),
    grand_total: z.number().nonnegative(),
});

export const createInvoiceSchema = invoiceBaseSchema;
export const createInvoiceNoteSchema = invoiceBaseSchema.extend({
    note_type: z.enum(["credit_note", "debit_note"]),
    note_reason: z.string().max(500).optional(),
});

export const recordPaymentSchema = z.object({
    party_id: z.string().uuid(),
    payment_type: z.enum(["received", "made"]),
    amount: z.number().positive(),
    payment_date: dateString,
    payment_mode: z.enum(["cash", "bank_transfer", "upi", "card", "cheque", "other"]),
    bank_account_id: z.string().uuid().optional(),
    allocations: z
        .array(
            z.object({
                invoice_id: z.string().uuid(),
                allocated_amount: z.number().positive(),
            })
        )
        .min(1),
});
