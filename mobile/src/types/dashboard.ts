export interface DashboardStats {
  revenue: {
    total: number;
    sales: number;
    purchases: number;
    growth_percentage: number;
  };
  invoices: {
    total: number;
    sales: number;
    purchases: number;
    unpaid: number;
    overdue: number;
  };
  payments: {
    total: number;
    received: number;
    made: number;
    unreconciled: number;
  };
  parties: {
    total: number;
    customers: number;
    suppliers: number;
    active: number;
  };
  inventory: {
    total_items: number;
    low_stock_items: number;
    total_value: number;
    active_items: number;
  };
}

export interface RecentInvoice {
  id: string;
  invoice_number: string;
  invoice_type: 'sales' | 'purchase';
  party_name: string;
  round_off: number;
  grand_total: number;
  payment_status: 'unpaid' | 'partial' | 'paid' | 'overdue';
  invoice_date: string;
}

export interface RecentPayment {
  id: string;
  party_name: string;
  payment_type: 'received' | 'made';
  amount: number;
  payment_date: string;
  payment_mode: string;
}

export interface LowStockItem {
  id: string;
  name: string;
  current_stock: number;
  low_stock_threshold: number;
  unit: string;
}

export interface DashboardData {
  stats: DashboardStats;
  recent_invoices: RecentInvoice[];
  recent_payments: RecentPayment[];
  low_stock_items: LowStockItem[];
}
