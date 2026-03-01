export interface CreateAnalyticsEventInput {
    business_id: string;
    event_type: string;
    entity_type?: string;
    entity_id?: string;
    actor_user_id?: string;
    occurred_at?: string;
    event_data?: Record<string, unknown>;
}

export interface AnalyticsEventRecord {
    id: string;
    business_id: string;
    event_type: string;
    entity_type?: string | null;
    entity_id?: string | null;
    actor_user_id?: string | null;
    occurred_at: string;
    event_data?: Record<string, unknown> | null;
}

export interface AnalyticsEventTypeCount {
    event_type: string;
    count: number;
}

export interface AnalyticsOverviewTotals {
    invoice_amount: number;
    payment_amount: number;
}

export interface AnalyticsOverviewResult {
    business_id: string;
    since: string;
    total_events: number;
    events_by_type: AnalyticsEventTypeCount[];
    totals: AnalyticsOverviewTotals;
}

export interface ListAnalyticsEventsInput {
    business_id: string;
    limit?: number;
}

export interface AnalyticsEventsResponse {
    items: AnalyticsEventRecord[];
}

export interface AnalyticsRollupRecord {
    id: string;
    business_id: string;
    event_date: string;
    event_type: string;
    event_count: number;
    invoice_amount: number;
    payment_amount: number;
    updated_at: string;
}

export interface AnalyticsRollupSummary {
    business_id: string;
    event_date: string;
    event_type: string;
    event_count: number;
    invoice_amount: number;
    payment_amount: number;
}

export interface AnalyticsRollupQuery {
    business_id: string;
    from_date?: string;
    to_date?: string;
}
