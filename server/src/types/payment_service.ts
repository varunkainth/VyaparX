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
    payment_mode: string;
    bank_account_id?: string;
    allocations: Allocation[];
    createdBy: string;
    idempotency_key?: string;

}

export type RecordPaymentBody = Omit<RecordPaymentInput, "business_id" | "createdBy" | "idempotency_key">;
