import { z } from "zod";

export const invoiceItemSchema = z.object({
  item_id: z.string().uuid().optional(),
  item_name: z.string().trim().min(1, "Item name is required"),
  description: z.string().optional(),
  hsn_code: z.string().max(8).optional(),
  unit: z.string().trim().min(1, "Unit is required"),
  quantity: z
    .number({ invalid_type_error: "Quantity is required" })
    .positive("Quantity must be greater than 0"),
  unit_price: z
    .number({ invalid_type_error: "Unit price is required" })
    .min(0, "Unit price must be 0 or greater"),
  discount_pct: z
    .number({ invalid_type_error: "Discount must be a valid number" })
    .min(0, "Discount cannot be negative")
    .max(100, "Discount cannot exceed 100%")
    .optional(),
  gst_rate: z
    .number({ invalid_type_error: "GST rate is required" })
    .min(0, "GST rate must be 0 or greater"),
});

export const createInvoiceSchema = z.object({
  party_id: z.string().uuid("Please select a party"),
  invoice_date: z.string().min(1, "Invoice date is required"),
  due_date: z.string().optional(),
  place_of_supply: z.string().length(2, "Place of supply must be a 2-digit state code"),
  is_igst: z.boolean(),
  price_mode: z.enum(["exclusive", "inclusive"]),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
  notes: z.string().optional(),
});

export const cancelInvoiceSchema = z.object({
  cancel_reason: z.string().optional(),
});

export type InvoiceItemFormData = z.infer<typeof invoiceItemSchema>;
export type CreateInvoiceFormData = z.infer<typeof createInvoiceSchema>;
export type CancelInvoiceFormData = z.infer<typeof cancelInvoiceSchema>;
