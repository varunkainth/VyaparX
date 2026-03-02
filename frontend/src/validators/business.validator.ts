import { z } from "zod";

// Create business validation schema
export const createBusinessSchema = z.object({
  name: z
    .string()
    .min(2, "Business name must be at least 2 characters")
    .max(200, "Business name is too long"),
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN format")
    .optional()
    .or(z.literal("")),
  pan: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format")
    .optional()
    .or(z.literal("")),
  address_line1: z
    .string()
    .min(3, "Address is required")
    .max(500, "Address is too long"),
  city: z
    .string()
    .max(100, "City name is too long")
    .optional()
    .or(z.literal("")),
  state: z
    .string()
    .max(100, "State name is too long")
    .optional()
    .or(z.literal("")),
  state_code: z
    .string()
    .length(2, "State code must be 2 digits")
    .optional()
    .or(z.literal("")),
  pincode: z
    .string()
    .regex(/^[0-9]{6}$/, "Pincode must be 6 digits")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .regex(/^[0-9]{10}$/, "Phone number must be 10 digits")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
});

// Update business validation schema (all fields optional)
export const updateBusinessSchema = z.object({
  name: z
    .string()
    .min(2, "Business name must be at least 2 characters")
    .max(200, "Business name is too long")
    .optional(),
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN format")
    .optional()
    .or(z.literal("")),
  pan: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format")
    .optional()
    .or(z.literal("")),
  address_line1: z
    .string()
    .min(3, "Address is required")
    .max(500, "Address is too long"),
  city: z
    .string()
    .max(100, "City name is too long")
    .optional()
    .or(z.literal("")),
  state: z
    .string()
    .max(100, "State name is too long")
    .optional()
    .or(z.literal("")),
  state_code: z
    .string()
    .length(2, "State code must be 2 digits")
    .optional()
    .or(z.literal("")),
  pincode: z
    .string()
    .regex(/^[0-9]{6}$/, "Pincode must be 6 digits")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .regex(/^[0-9]{10}$/, "Phone number must be 10 digits")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  is_active: z.boolean().optional(),
});

// Invite member validation schema
export const inviteMemberSchema = z.object({
  user_id: z
    .string()
    .min(1, "User ID is required")
    .uuid("Invalid user ID"),
  role: z.enum(["owner", "admin", "staff", "viewer", "accountant"], {
    message: "Invalid role selected",
  }),
});

// Update member role validation schema
export const updateMemberRoleSchema = z.object({
  role: z.enum(["owner", "admin", "staff", "viewer", "accountant"], {
    message: "Invalid role selected",
  }),
});

// Update member status validation schema
export const updateMemberStatusSchema = z.object({
  is_active: z.boolean(),
});

// Export types inferred from schemas
export type CreateBusinessFormData = z.infer<typeof createBusinessSchema>;
export type UpdateBusinessFormData = z.infer<typeof updateBusinessSchema>;
export type InviteMemberFormData = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleFormData = z.infer<typeof updateMemberRoleSchema>;
export type UpdateMemberStatusFormData = z.infer<typeof updateMemberStatusSchema>;
