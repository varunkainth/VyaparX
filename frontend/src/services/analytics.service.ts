import apiClient from "@/lib/api-client";
import type { AnalyticsData, ActivityData, AnalyticsOverview, AnalyticsEvent, AnalyticsRollup } from "@/types/analytics";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const analyticsService = {
  async getAnalytics(businessId: string, days: number = 30): Promise<AnalyticsData> {
    const response = await apiClient.get<ApiResponse<AnalyticsData>>(
      `/api/v1/businesses/${businessId}/analytics?days=${days}`
    );
    return response.data.data;
  },

  async getActivity(
    businessId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<ActivityData> {
    const response = await apiClient.get<ApiResponse<ActivityData>>(
      `/api/v1/businesses/${businessId}/activity?page=${page}&limit=${limit}`
    );
    return response.data.data;
  },

  async getAnalyticsOverview(
    businessId: string,
    sinceHours: number = 24
  ): Promise<AnalyticsOverview> {
    const response = await apiClient.get<ApiResponse<AnalyticsOverview>>(
      `/api/v1/businesses/${businessId}/analytics/overview?since_hours=${sinceHours}`
    );
    return response.data.data;
  },

  async getAnalyticsEvents(
    businessId: string,
    limit: number = 20
  ): Promise<{ items: AnalyticsEvent[] }> {
    const response = await apiClient.get<ApiResponse<{ items: AnalyticsEvent[] }>>(
      `/api/v1/businesses/${businessId}/analytics/events?limit=${limit}`
    );
    return response.data.data;
  },

  async getAnalyticsRollups(
    businessId: string,
    params?: {
      from_date?: string;
      to_date?: string;
    }
  ): Promise<{ items: AnalyticsRollup[] }> {
    const response = await apiClient.get<ApiResponse<{ items: AnalyticsRollup[] }>>(
      `/api/v1/businesses/${businessId}/analytics/rollups`,
      { params }
    );
    return response.data.data;
  },
};
