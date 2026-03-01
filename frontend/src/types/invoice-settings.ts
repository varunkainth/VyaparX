export interface InvoiceSettings {
  id: string;
  business_id: string;
  
  // Invoice Numbering
  invoice_prefix: string;
  invoice_number_format: string; // e.g., "INV-{YYYY}-{####}"
  next_invoice_number: number;
  reset_numbering: "never" | "yearly" | "monthly";
  
  // Purchase Invoice Numbering
  purchase_prefix: string;
  purchase_number_format: string;
  next_purchase_number: number;
  
  // Default Settings
  default_due_days: number;
  default_template: string;
  default_currency: string;
  
  // Tax Settings
  enable_tax: boolean;
  tax_label: string; // "GST", "VAT", etc.
  show_tax_number: boolean;
  
  // Display Settings
  show_logo: boolean;
  show_signature: boolean;
  show_terms: boolean;
  default_terms: string | null;
  show_notes: boolean;
  default_notes: string | null;
  
  // Email Settings
  email_subject_template: string;
  email_body_template: string;
  auto_send_email: boolean;
  
  // Payment Settings
  enable_online_payment: boolean;
  payment_instructions: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface UpdateInvoiceSettingsInput {
  invoice_prefix?: string;
  invoice_number_format?: string;
  next_invoice_number?: number;
  reset_numbering?: "never" | "yearly" | "monthly";
  
  purchase_prefix?: string;
  purchase_number_format?: string;
  next_purchase_number?: number;
  
  default_due_days?: number;
  default_template?: string;
  default_currency?: string;
  
  enable_tax?: boolean;
  tax_label?: string;
  show_tax_number?: boolean;
  
  show_logo?: boolean;
  show_signature?: boolean;
  show_terms?: boolean;
  default_terms?: string;
  show_notes?: boolean;
  default_notes?: string;
  
  email_subject_template?: string;
  email_body_template?: string;
  auto_send_email?: boolean;
  
  enable_online_payment?: boolean;
  payment_instructions?: string;
}

export const INVOICE_TEMPLATES = [
  { value: "default", label: "Default Template" },
  { value: "modern", label: "Modern Template" },
  { value: "classic", label: "Classic Template" },
  { value: "minimal", label: "Minimal Template" },
];

export const NUMBER_FORMATS = [
  { value: "INV-{YYYY}-{####}", label: "INV-2026-0001" },
  { value: "INV-{####}", label: "INV-0001" },
  { value: "{YYYY}/{MM}/{####}", label: "2026/02/0001" },
  { value: "{PREFIX}-{YYYY}{MM}{####}", label: "INV-20260200001" },
];
