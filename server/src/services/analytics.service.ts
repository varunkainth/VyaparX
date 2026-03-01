import { analyticsRepository } from "../repository/analytics.repository";
import type {
    AnalyticsEventRecord,
    AnalyticsEventTypeCount,
    AnalyticsOverviewResult,
    CreateAnalyticsEventInput,
    AnalyticsRollupRecord,
    AnalyticsRollupQuery,
    AnalyticsRollupSummary,
} from "../types/analytics";
import { logger } from "../utils/logger";

const DEFAULT_OVERVIEW_WINDOW_MS = 1000 * 60 * 60 * 24;
const DEFAULT_ROLLUP_DAYS = 7;

export async function trackAnalyticsEvent(input: CreateAnalyticsEventInput): Promise<void> {
    try {
        await analyticsRepository.createEvent(input);
        logger.debug(
            {
                eventType: input.event_type,
                entityType: input.entity_type,
                entityId: input.entity_id,
                businessId: input.business_id,
                actorUserId: input.actor_user_id,
                eventData: input.event_data ?? null,
            },
            "Analytics event recorded"
        );
    } catch (error) {
        logger.warn(
            {
                eventType: input.event_type,
                entityType: input.entity_type,
                entityId: input.entity_id,
                businessId: input.business_id,
                actorUserId: input.actor_user_id,
                err: error,
            },
            "Failed to write analytics event"
        );
    }
}

export async function fetchRecentAnalyticsEvents(
    businessId: string,
    limit = 20
): Promise<AnalyticsEventRecord[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    return analyticsRepository.listEvents(businessId, safeLimit);
}

export async function fetchAnalyticsOverview(
    businessId: string,
    windowMs = DEFAULT_OVERVIEW_WINDOW_MS
): Promise<AnalyticsOverviewResult> {
    const durationMs = Math.max(windowMs, 60 * 1000);
    const since = new Date(Date.now() - durationMs).toISOString();
    const counts = await analyticsRepository.countEventsByType(businessId, since);
    const totalEvents = counts.reduce((sum, record) => sum + record.count, 0);
    const invoiceTotalRaw = await analyticsRepository.sumEventField(
        businessId,
        "invoice_created",
        "grand_total",
        since
    );
    const paymentTotalRaw = await analyticsRepository.sumEventField(
        businessId,
        "payment_recorded",
        "amount",
        since
    );

    return {
        business_id: businessId,
        since,
        total_events: totalEvents,
        events_by_type: counts,
        totals: {
            invoice_amount: Number(invoiceTotalRaw ?? 0),
            payment_amount: Number(paymentTotalRaw ?? 0),
        },
    };
}

export async function runAnalyticsRollupJob(options?: {
    businessId?: string;
    daysBack?: number;
    since?: string;
    until?: string;
}): Promise<AnalyticsRollupSummary[]> {
    const end = options?.until ? new Date(options.until) : new Date();
    const daysBack = Math.max(1, options?.daysBack ?? DEFAULT_ROLLUP_DAYS);
    const start = options?.since ? new Date(options.since) : new Date(end.getTime() - daysBack * 24 * 60 * 60 * 1000);

    const since = start.toISOString();
    const until = end.toISOString();

    const aggregated = await analyticsRepository.aggregateEvents({
        businessId: options?.businessId,
        since,
        until,
    });

    await analyticsRepository.upsertRollups(aggregated);
    return aggregated;
}

export async function fetchAnalyticsRollups(
    query: AnalyticsRollupQuery
): Promise<AnalyticsRollupRecord[]> {
    return analyticsRepository.listRollups(query.business_id, query.from_date, query.to_date);
}
