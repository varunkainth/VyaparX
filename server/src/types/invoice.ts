import type { InvoiceItemInput } from "./invoice_service";

export type PriceMode = "exclusive" | "inclusive";

export type InvoiceNoteType = "credit_note" | "debit_note";

export interface ComputedInvoiceItem {
    item: InvoiceItemInput;
    price_mode: PriceMode;
    discountAmount: number;
    taxableValue: number;
    cgstRate: number;
    sgstRate: number;
    igstRate: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalAmount: number;
    baseAmount: number;
}

export interface ListInvoicesInput {
    business_id: string;
    party_id?: string;
    payment_status?: "unpaid" | "partial" | "paid" | "overdue";
    invoice_type?: "sales" | "purchase" | "credit_note" | "debit_note";
    from_date?: string;
    to_date?: string;
    search?: string;
    include_cancelled?: boolean;
    page?: number;
    limit?: number;
}

export interface CancelInvoiceInput {
    business_id: string;
    invoice_id: string;
    cancelled_by: string;
    cancel_reason?: string;
}

export type CancelInvoiceBody = Pick<CancelInvoiceInput, "cancel_reason">;

export interface InvoiceParams {
    business_id: string;
    invoice_id: string;
    [key: string]: string;
}

export interface InvoiceListQueryRaw {
    [key: string]: string | undefined;
    party_id?: string;
    payment_status?: "unpaid" | "partial" | "paid" | "overdue";
    invoice_type?: "sales" | "purchase" | "credit_note" | "debit_note";
    from_date?: string;
    to_date?: string;
    search?: string;
    include_cancelled?: "true" | "false";
    page?: string;
    limit?: string;
}

export interface InvoiceItemRecord {
    id: string;
    invoice_id: string;
    item_name: string;
    quantity: string | number;
    unit: string;
    unit_price: string | number;
    price_mode: PriceMode;
    discount_pct?: string | number;
    discount_amount?: string | number;
    gst_rate: string | number;
    taxable_value?: string | number;
    cgst_rate?: string | number;
    sgst_rate?: string | number;
    igst_rate?: string | number;
    cgst_amount?: string | number;
    sgst_amount?: string | number;
    igst_amount?: string | number;
    total_amount: string | number;
    [key: string]: unknown;
}

export interface InvoiceRecord {
    id: string;
    business_id: string;
    party_id: string;
    invoice_number: string;
    invoice_date: string;
    due_date?: string | null;
    payment_status: "unpaid" | "partial" | "paid" | "overdue";
    subtotal?: string | number;
    taxable_amount: string | number;
    total_tax: string | number;
    round_off?: string | number;
    grand_total: string | number;
    amount_paid?: string | number;
    balance_due?: string | number;
    place_of_supply?: string;
    reference_invoice_id?: string | null;
    note_reason?: string | null;
    [key: string]: unknown;
}

export interface InvoiceDetail extends InvoiceRecord {
    items: InvoiceItemRecord[];
}

export interface InvoicePdfData {
    businessName: string;
    partyName: string;
    invoice: InvoiceDetail;
    template: InvoicePdfTemplate;
    business?: Record<string, unknown>;
    party?: Record<string, unknown>;
}

export const INVOICE_PDF_TEMPLATES = ["classic", "modern", "compact", "bill_pro", "bill_pro_legacy"] as const;
export type InvoicePdfTemplate = (typeof INVOICE_PDF_TEMPLATES)[number];

export interface InvoicePdfQueryRaw {
    [key: string]: string | undefined;
    template?: InvoicePdfTemplate;
}
