import { z } from "zod";

export const createInventoryItemSchema = z.object({
    name: z.string().min(2).max(200),
    sku: z.string().max(100).optional(),
    hsn_code: z.string().max(8).optional(),
    description: z.string().optional(),
    unit: z.string().min(1).max(20),
    gst_rate: z.number().nonnegative(),
    purchase_price: z.number().nonnegative(),
    selling_price: z.number().nonnegative(),
    low_stock_threshold: z.number().nonnegative().optional(),
    opening_stock: z.number().nonnegative().optional(),
    opening_stock_note: z.string().max(500).optional(),
});

export const updateInventoryItemSchema = z
    .object({
        name: z.string().min(2).max(200).optional(),
        sku: z.string().max(100).optional(),
        hsn_code: z.string().max(8).optional(),
        description: z.string().optional(),
        unit: z.string().min(1).max(20).optional(),
        gst_rate: z.number().nonnegative().optional(),
        purchase_price: z.number().nonnegative().optional(),
        selling_price: z.number().nonnegative().optional(),
        low_stock_threshold: z.number().nonnegative().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
        message: "At least one field is required",
    });

export const adjustInventoryStockSchema = z.object({
    quantity: z.number().positive(),
    direction: z.enum(["in", "out"]),
    unit_price: z.number().nonnegative().optional(),
    notes: z.string().max(500).optional(),
});
