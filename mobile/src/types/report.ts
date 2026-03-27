export interface MonthlySalesReportItem {
  month: string;
  invoice_count: number;
  taxable_amount: number;
  total_tax: number;
  grand_total: number;
}

export interface OutstandingSummary {
  total_receivable: number;
  total_payable: number;
}

export interface OutstandingParty {
  id: string;
  name: string;
  party_type: 'customer' | 'supplier' | 'both';
  phone: string | null;
  current_balance: number;
}

export interface OutstandingReport {
  summary: OutstandingSummary;
  parties: OutstandingParty[];
}

export interface GstSummaryReport {
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_tax: number;
  grand_total: number;
}

export interface LowStockReportItem {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  current_stock: number;
  low_stock_threshold: number;
  selling_price: number;
}

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
