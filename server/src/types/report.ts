export interface ReportsParams {
    business_id: string;
    [key: string]: string;
}

export interface DateRangeQueryRaw {
    [key: string]: string | undefined;
    from_date?: string;
    to_date?: string;
}

export interface GstSummaryQueryRaw extends DateRangeQueryRaw {
    invoice_type?: "sales" | "purchase" | "credit_note" | "debit_note";
}

export type ExportFormat = "csv" | "excel";

export interface ReportExportQueryRaw {
    [key: string]: string | undefined;
    format?: ExportFormat;
}

export interface DateRangeExportQueryRaw extends DateRangeQueryRaw, ReportExportQueryRaw {}

export interface GstSummaryExportQueryRaw extends GstSummaryQueryRaw, ReportExportQueryRaw {}

export interface PurchaseReport {
    invoice_count: number;
    taxable_amount: number;
    cgst_amount: number;
    sgst_amount: number;
    igst_amount: number;
    total_tax: number;
    grand_total: number;
}

export interface ProfitLossReport {
    sales_total: number;
    purchase_total: number;
    gross_profit: number;
    profit_margin: number;
}
