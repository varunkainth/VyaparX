import { z } from "zod";
import {
  getStateCodesForPincode,
  isStateCodeValidForPincode,
} from "../constants/pinStateMapping";

const createPartyBase = z.object({
  name: z.string().min(2).max(150),
  party_type: z.enum(["customer", "supplier", "both"]),
  gstin: z.string().max(100).optional(),
  pan: z.string().max(10).optional(),
  state_code: z.string().length(2).optional(),
  state: z.string().max(100).optional(),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  pincode: z
    .string()
    .regex(/^\d{6}$/, "Pincode must be 6 digits")
    .optional(),
  phone: z.string().max(15).optional(),
  email: z.string().email().max(100).optional(),
  opening_balance: z.number().nonnegative().optional(),
  opening_balance_type: z.enum(["receivable", "payable", "none"]).optional(),
  notes: z.string().optional(),
});

export const createPartySchema = createPartyBase.superRefine((data, ctx) => {
  if (!data.pincode || data.pincode.length === 0) {
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

export const updatePartySchema = createPartyBase
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  })
  .superRefine((data, ctx) => {
    if (!data.pincode || data.pincode.length === 0) {
      return;
    }

    if (!/^\d{6}$/.test(data.pincode)) {
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
