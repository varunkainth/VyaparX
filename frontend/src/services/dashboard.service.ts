import apiClient from "@/lib/api-client";
import type { DashboardData } from "@/types/dashboard";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const dashboardService = {
  async getDashboardData(businessId: string): Promise<DashboardData> {
    const response = await apiClient.get<ApiResponse<DashboardData>>(
      `/api/v1/businesses/${businessId}/dashboard`
    );
    return response.data.data;
  },
};
