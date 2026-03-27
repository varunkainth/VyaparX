export interface AnalyticsTimeSeriesData {
  date: string;
  sales: number;
  purchases: number;
  profit: number;
}

export interface AnalyticsCategoryData {
  category: string;
  value: number;
  percentage: number;
}

export interface AnalyticsTopItem {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface AnalyticsTopParty {
  id: string;
  name: string;
  party_type: 'customer' | 'supplier' | 'both';
  total_amount: number;
  invoice_count: number;
}

export interface AnalyticsData {
  time_series: AnalyticsTimeSeriesData[];
  payment_modes: AnalyticsCategoryData[];
  top_selling_items: AnalyticsTopItem[];
  top_customers: AnalyticsTopParty[];
  top_suppliers: AnalyticsTopParty[];
  monthly_comparison: {
    current_month: {
      sales: number;
      purchases: number;
      profit: number;
    };
    last_month: {
      sales: number;
      purchases: number;
      profit: number;
    };
  };
}

export interface ActivityEvent {
  id: string;
  event_type: string;
  description: string;
  user_name: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ActivityData {
  events: ActivityEvent[];
  total: number;
  page: number;
  limit: number;
}
