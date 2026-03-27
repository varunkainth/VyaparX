import apiClient from '@/lib/api-client';
import type { ApiResponse } from '@/types/auth';
import type { ActivityData, AnalyticsData } from '@/types/analytics';

export const analyticsService = {
  async getAnalytics(business_id: string, days = 30): Promise<AnalyticsData> {
    const response = await apiClient.get<ApiResponse<AnalyticsData>>(`/api/v1/businesses/${business_id}/analytics`, {
      params: { days },
    });
    return response.data.data;
  },

  async getActivity(business_id: string, page = 1, limit = 20): Promise<ActivityData> {
    const response = await apiClient.get<ApiResponse<ActivityData>>(`/api/v1/businesses/${business_id}/activity`, {
      params: { limit, page },
    });
    return response.data.data;
  },
};
