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
