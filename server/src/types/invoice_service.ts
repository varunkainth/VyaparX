import type { PriceMode } from "./invoice";

export interface InvoiceItemInput {
    item_id?: string;
    item_name: string;
    description?: string;
    hsn_code?: string;
    unit: string;
    quantity: number;
    unit_price: number;
    discount_pct?: number;
    gst_rate: number;
    price_mode?: PriceMode;
    [key: string]: unknown;
}

export interface CreateInvoiceInput {
    business_id: string;
    party_id: string;
    invoice_date: string;
    place_of_supply: string;
    is_igst: boolean;
    financial_year?: string;
    items: InvoiceItemInput[];
    subtotal: number;
    taxable_amount: number;
    total_tax: number;
    round_off?: number;
    grand_total: number;
    created_by: string;
    idempotency_key?: string;
    reference_invoice_id?: string;
    note_reason?: string;
}

export interface CreateInvoiceNoteInput extends CreateInvoiceInput {
    reference_invoice_id: string;
    note_type: "credit_note" | "debit_note";
    note_reason?: string;
}

export type CreateSalesInvoiceBody = Omit<
    CreateInvoiceInput,
    "business_id" | "created_by" | "financial_year" | "idempotency_key"
>;

export type CreateInvoiceNoteBody = Omit<
    CreateInvoiceNoteInput,
    "business_id" | "created_by" | "reference_invoice_id" | "financial_year" | "idempotency_key"
>;
