import { z } from "zod";

export const recordPaymentSchema = z.object({
  party_id: z.string().uuid("Invalid party ID"),
  payment_type: z.enum(["received", "made"], {
    error: "Payment type is required",
  }),
  amount: z.number().positive("Amount must be greater than 0"),
  payment_date: z.string().min(1, "Payment date is required"),
  payment_mode: z.enum(["cash", "bank_transfer", "upi", "card", "cheque", "other"], {
    error: "Payment mode is required",
  }),
  bank_account_id: z.string().uuid().optional(),
  upi_ref: z.string().max(100).optional(),
  cheque_no: z.string().max(50).optional(),
  cheque_date: z.string().optional(),
  notes: z.string().optional(),
  allocations: z.array(
    z.object({
      invoice_id: z.string().uuid("Invalid invoice ID"),
      allocated_amount: z.number().positive("Allocated amount must be greater than 0"),
    })
  ).min(1, "At least one invoice allocation is required"),
}).superRefine((data, ctx) => {
  // UPI payments require transaction reference
  if (data.payment_mode === "upi" && !data.upi_ref) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "UPI transaction reference is required for UPI payments",
      path: ["upi_ref"],
    });
  }

  // Cheque payments require cheque number
  if (data.payment_mode === "cheque" && !data.cheque_no) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Cheque number is required for cheque payments",
      path: ["cheque_no"],
    });
  }

  // Bank transfer should have bank account
  if (data.payment_mode === "bank_transfer" && !data.bank_account_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Bank account is required for bank transfer payments",
      path: ["bank_account_id"],
    });
  }
});

export const reconcilePaymentSchema = z.object({
  bank_statement_date: z.string().optional(),
  bank_ref_no: z.string().max(100).optional(),
  notes: z.string().optional(),
});

export type RecordPaymentFormData = z.infer<typeof recordPaymentSchema>;
export type ReconcilePaymentFormData = z.infer<typeof reconcilePaymentSchema>;
