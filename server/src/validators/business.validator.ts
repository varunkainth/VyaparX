import { z } from "zod";
import { USER_ROLES } from "../types/user";

const roleEnum = z.enum(USER_ROLES);

const createBusinessBase = z.object({
    name: z.string().min(2).max(255),
    gstin: z.string().max(20).optional(),
    pan: z.string().max(10).optional(),
    state_code: z.string().length(2),
    address_line1: z.string().min(3),
    address_line2: z.string().optional(),
    city: z.string().min(2).max(100),
    state: z.string().min(2).max(100),
    pincode: z.string().min(4).max(10),
    phone: z.string().min(8).max(15),
    email: z.string().email().max(255),
    website: z.string().max(255).optional(),
    logo_url: z.string().max(2048).optional(),
    signature_url: z.string().max(2048).optional(),
    invoice_prefix: z.string().max(10).optional(),
    purchase_prefix: z.string().max(10).optional(),
    reset_numbering: z.enum(["never", "yearly", "monthly"]).optional(),
    bank_name: z.string().max(100).optional(),
    bank_account_no: z.string().max(30).optional(),
    bank_ifsc: z.string().max(11).optional(),
    bank_branch: z.string().max(100).optional(),
    upi_id: z.string().max(100).optional(),
});

export const createBusinessSchema = createBusinessBase;

export const updateBusinessSchema = createBusinessBase
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
        message: "At least one field is required",
    });

export const inviteBusinessMemberSchema = z.object({
    email: z.string().email(),
    role: roleEnum.refine((role) => role !== "owner", {
        message: "owner role cannot be assigned via invite",
    }),
});

export const updateBusinessMemberRoleSchema = z.object({
    role: roleEnum.refine((role) => role !== "owner", {
        message: "owner role cannot be assigned",
    }),
});

export const updateBusinessMemberStatusSchema = z.object({
    is_active: z.boolean(),
});
