export type PaymentType = "received" | "made";
export type PaymentMode =
  | "cash"
  | "bank_transfer"
  | "upi"
  | "card"
  | "cheque"
  | "other";

export interface Payment {
  id: string;
  business_id: string;
  party_id: string;
  party_name: string;
  party_type: "customer" | "supplier" | "both";
  payment_type: PaymentType;
  amount: number;
  payment_date: string;
  payment_mode: PaymentMode;
  upi_ref: string | null;
  cheque_no: string | null;
  cheque_date: string | null;
  bank_account_id: string | null;
  bank_ref_no: string | null;
  bank_statement_date: string | null;
  is_reconciled: boolean;
  reconciled_at: string | null;
  reconciled_by: string | null;
  reconciled_by_name: string | null;
  notes: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentAllocation {
  id: string;
  payment_id: string;
  invoice_id: string;
  invoice_number: string;
  allocated_amount: number;
  created_at: string;
}

export interface PaymentWithAllocations extends Payment {
  allocations: PaymentAllocation[];
}

export interface RecordPaymentInput {
  party_id: string;
  payment_type: PaymentType;
  amount: number;
  payment_date: string;
  payment_mode: PaymentMode;
  bank_account_id?: string;
  bank_ref_no?: string;
  upi_ref?: string;
  cheque_no?: string;
  cheque_date?: string;
  notes?: string;
  allocations: {
    invoice_id: string;
    allocated_amount: number;
  }[];
}

export interface RecordPaymentResult {
  success: boolean;
  payment_id: string;
}

export interface ReconcilePaymentInput {
  bank_statement_date?: string;
  bank_ref_no?: string;
  notes?: string;
}

export interface ListPaymentsQuery {
  party_id?: string;
  payment_type?: PaymentType;
  payment_mode?: PaymentMode;
  is_reconciled?: boolean;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}

export const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];
