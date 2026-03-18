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

    return {
      ...response.data.data,
      recent_invoices: response.data.data.recent_invoices.map((invoice) => ({
        ...invoice,
        round_off:
          typeof invoice.round_off === "string"
            ? parseFloat(invoice.round_off)
            : invoice.round_off,
        grand_total:
          typeof invoice.grand_total === "string"
            ? parseFloat(invoice.grand_total)
            : invoice.grand_total,
      })),
    };
  },
};
