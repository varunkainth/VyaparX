export type InvoiceType = "sales" | "purchase" | "credit_note" | "debit_note";
export type PaymentStatus = "unpaid" | "partial" | "paid" | "overdue";
export type PriceMode = "exclusive" | "inclusive";

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  item_id: string | null;
  item_name: string;
  hsn_code: string | null;
  description: string | null;
  unit: string;
  quantity: number;
  unit_price: number;
  price_mode: PriceMode;
  discount_pct: number;
  discount_amount: number;
  taxable_value: number;
  gst_rate: number;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_amount: number;
  sort_order: number;
}

export interface Invoice {
  id: string;
  business_id: string;
  party_id: string;
  party_name: string;
  party_type: "customer" | "supplier" | "both";
  invoice_type: InvoiceType;
  invoice_number: string;
  financial_year: string;
  invoice_date: string;
  due_date: string | null;
  place_of_supply: string;
  is_igst: boolean;
  subtotal: number;
  total_discount: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_tax: number;
  round_off: number;
  grand_total: number;
  amount_paid: number;
  balance_due: number;
  payment_status: PaymentStatus;
  notes: string | null;
  template_id: string;
  pdf_url: string | null;
  is_cancelled: boolean;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[];
}

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
}

export interface CreateInvoiceInput {
  party_id: string;
  invoice_date: string;
  due_date?: string;
  place_of_supply: string;
  is_igst: boolean;
  items: InvoiceItemInput[];
  notes?: string;
}

export interface ListInvoicesQuery {
  party_id?: string;
  payment_status?: PaymentStatus;
  invoice_type?: InvoiceType;
  from_date?: string;
  to_date?: string;
  search?: string;
  include_cancelled?: boolean;
  page?: number;
  limit?: number;
}

export interface CancelInvoiceInput {
  cancel_reason?: string;
}

export type NoteType = "credit_note" | "debit_note";

export interface CreateInvoiceNoteInput extends CreateInvoiceInput {
  note_type: NoteType;
  note_reason?: string;
}
