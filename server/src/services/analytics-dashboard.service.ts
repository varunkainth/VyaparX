import { analyticsDashboardRepository } from "../repository/analytics-dashboard.repository";
import type { AnalyticsData } from "../repository/analytics-dashboard.repository";

export async function getAnalytics(businessId: string, days: number = 30): Promise<AnalyticsData> {
    return await analyticsDashboardRepository.getAnalytics(businessId, days);
}

export async function getActivity(businessId: string, page: number = 1, limit: number = 20) {
    const { events, total } = await analyticsDashboardRepository.getActivity(businessId, page, limit);
    
    return {
        events,
        total,
        page,
        limit,
    };
}
