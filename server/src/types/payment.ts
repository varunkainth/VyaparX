export interface ListPaymentsInput {
    business_id: string;
    party_id?: string;
    payment_type?: "received" | "made";
    payment_mode?: "cash" | "bank_transfer" | "upi" | "card" | "cheque" | "other";
    is_reconciled?: boolean;
    from_date?: string;
    to_date?: string;
    page?: number;
    limit?: number;
}

export interface ReconcilePaymentInput {
    business_id: string;
    payment_id: string;
    reconciled_by: string;
    bank_statement_date?: string;
    bank_ref_no?: string;
    notes?: string;
}

export interface UnreconcilePaymentInput {
    business_id: string;
    payment_id: string;
    requested_by?: string;
}

export type ReconcilePaymentBody = Omit<
    ReconcilePaymentInput,
    "business_id" | "payment_id" | "reconciled_by"
>;

export interface PaymentParams {
    business_id: string;
    payment_id: string;
    [key: string]: string;
}

export interface PaymentListQueryRaw {
    [key: string]: string | undefined;
    party_id?: string;
    payment_type?: "received" | "made";
    payment_mode?: "cash" | "bank_transfer" | "upi" | "card" | "cheque" | "other";
    is_reconciled?: "true" | "false";
    from_date?: string;
    to_date?: string;
    page?: string;
    limit?: string;
}
