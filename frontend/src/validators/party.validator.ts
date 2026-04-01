import { z } from "zod";
import {
  getStateCodesForPincode,
  isStateCodeValidForPincode,
} from "@/constants/pin-state-mapping";

const partySchemaFields = {
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(150, "Name is too long"),
  party_type: z.enum(["customer", "supplier", "both"], {
    error: "Party type is required",
  }),
  gstin: z
    .string()
    .length(15, "GSTIN must be 15 characters")
    .optional()
    .or(z.literal("")),
  pan: z
    .string()
    .length(10, "PAN must be 10 characters")
    .optional()
    .or(z.literal("")),
  state_code: z
    .string()
    .length(2, "State code must be 2 characters")
    .optional()
    .or(z.literal("")),
  state: z.string().max(100).optional().or(z.literal("")),
  address: z
    .string({ error: "Address is required" })
    .trim()
    .min(1, "Address is required"),
  city: z.string().max(100).optional().or(z.literal("")),
  pincode: z
    .string()
    .regex(/^\d{6}$/, "Pincode must be 6 digits")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .regex(/^\d{10}$/, "Phone must be 10 digits")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .email("Invalid email address")
    .max(100)
    .optional()
    .or(z.literal("")),
  opening_balance: z
    .number()
    .nonnegative("Opening balance cannot be negative")
    .optional(),
  opening_balance_type: z.enum(["receivable", "payable", "none"]).optional(),
  notes: z.string().optional().or(z.literal("")),
};

const applyPincodeStateValidation = <T extends z.ZodTypeAny>(schema: T) =>
  schema.superRefine((data: { pincode?: string; state_code?: string }, ctx) => {
    if (!data.pincode || data.pincode.length !== 6) {
      return;
    }

    const matchingStateCodes = getStateCodesForPincode(data.pincode);

    if (matchingStateCodes.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pincode"],
        message: "Pincode prefix does not match any mapped state",
      });
      return;
    }

    if (
      data.state_code &&
      !isStateCodeValidForPincode(data.state_code, data.pincode)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["state_code"],
        message: "Selected state does not match pincode",
      });
    }
  });

export const createPartySchema = applyPincodeStateValidation(
  z.object(partySchemaFields),
);

export const updatePartySchema = applyPincodeStateValidation(
  z.object(partySchemaFields).partial().extend({
    is_active: z.boolean().optional(),
  }),
);

export type CreatePartyFormData = z.infer<typeof createPartySchema>;
export type UpdatePartyFormData = z.infer<typeof updatePartySchema>;
