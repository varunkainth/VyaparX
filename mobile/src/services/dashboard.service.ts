import apiClient from '../lib/api-client';
import type { ApiResponse } from '../types/auth';
import type { DashboardData } from '../types/dashboard';

export const dashboardService = {
  async getDashboard(business_id: string): Promise<DashboardData> {
    const response = await apiClient.get<ApiResponse<DashboardData>>(`/api/v1/businesses/${business_id}/dashboard`);
    return response.data.data;
  },
};
