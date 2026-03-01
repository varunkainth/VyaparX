export interface MonthlySalesReport {
  month: string;
  invoice_count: number;
  taxable_amount: string;
  total_tax: string;
  grand_total: string;
}

export interface OutstandingParty {
  id: string;
  name: string;
  party_type: "customer" | "supplier" | "both";
  phone: string | null;
  current_balance: string;
}

export interface OutstandingReport {
  summary: {
    total_receivable: string;
    total_payable: string;
  };
  parties: OutstandingParty[];
}

export interface GstSummaryReport {
  taxable_amount: string;
  cgst_amount: string;
  sgst_amount: string;
  igst_amount: string;
  total_tax: string;
  grand_total: string;
}

export interface LowStockItem {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  current_stock: string;
  low_stock_threshold: string;
  selling_price: string;
}
