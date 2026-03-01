import { z } from "zod";

export const createInventorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200, "Name is too long"),
  sku: z.string().max(100, "SKU is too long").optional().or(z.literal("")),
  hsn_code: z.string().max(8, "HSN code must be max 8 characters").optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  unit: z.string().min(1, "Unit is required").max(20, "Unit is too long"),
  gst_rate: z.number({ error: "GST rate is required" }).nonnegative("GST rate cannot be negative"),
  purchase_price: z.number({ error: "Purchase price is required" }).nonnegative("Purchase price cannot be negative"),
  selling_price: z.number({ error: "Selling price is required" }).nonnegative("Selling price cannot be negative"),
  low_stock_threshold: z.number().nonnegative("Threshold cannot be negative").optional(),
  opening_stock: z.number().nonnegative("Opening stock cannot be negative").optional(),
  opening_stock_note: z.string().max(500, "Note is too long").optional().or(z.literal("")),
});

export const updateInventorySchema = createInventorySchema.partial().omit({
  opening_stock: true,
  opening_stock_note: true,
});

export const adjustStockSchema = z.object({
  quantity: z.number({ error: "Quantity is required" }).positive("Quantity must be positive"),
  direction: z.enum(["in", "out"], { error: "Direction is required" }),
  unit_price: z.number().nonnegative("Unit price cannot be negative").optional(),
  notes: z.string().max(500, "Notes are too long").optional().or(z.literal("")),
});

export type CreateInventoryFormData = z.infer<typeof createInventorySchema>;
export type UpdateInventoryFormData = z.infer<typeof updateInventorySchema>;
export type AdjustStockFormData = z.infer<typeof adjustStockSchema>;
