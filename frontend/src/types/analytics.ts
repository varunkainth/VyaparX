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
  party_type: "customer" | "supplier" | "both";
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
  metadata: Record<string, any>;
  created_at: string;
}

export interface ActivityData {
  events: ActivityEvent[];
  total: number;
  page: number;
  limit: number;
}

export interface AnalyticsOverview {
  total_events: number;
  unique_users: number;
  event_breakdown: Record<string, number>;
  time_range_ms: number;
}

export interface AnalyticsEvent {
  id: string;
  business_id: string;
  user_id: string | null;
  event_type: string;
  event_data: Record<string, any>;
  occurred_at: string;
  created_at: string;
}

export interface AnalyticsRollup {
  id: string;
  business_id: string;
  rollup_date: string;
  event_type: string;
  event_count: number;
  aggregated_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}
