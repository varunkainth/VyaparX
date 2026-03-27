export interface Allocation {
    invoice_id: string;
    allocated_amount: number;
}

export interface RecordPaymentInput {
    business_id: string;
    party_id: string;
    payment_type: "received" | "made";
    amount: number;
    payment_date: string;
    payment_mode: "cash" | "bank_transfer" | "upi" | "card" | "cheque" | "other";
    bank_account_id?: string;
    upi_ref?: string;
    cheque_no?: string;
    cheque_date?: string;
    bank_ref_no?: string;
    notes?: string;
    allocations: Allocation[];
    createdBy: string;
    idempotency_key?: string;

}

export type RecordPaymentBody = Omit<RecordPaymentInput, "business_id" | "createdBy" | "idempotency_key">;
