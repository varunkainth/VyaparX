import apiClient from '../lib/api-client';
import type { ApiResponse } from '../types/auth';
import type {
  GstSummaryReport,
  LowStockReportItem,
  MonthlySalesReportItem,
  OutstandingReport,
} from '../types/report';

interface DateRangeParams {
  from_date?: string;
  to_date?: string;
}

export const reportService = {
  async getMonthlySalesReport(
    business_id: string,
    params?: DateRangeParams
  ): Promise<MonthlySalesReportItem[]> {
    const response = await apiClient.get<ApiResponse<MonthlySalesReportItem[]>>(
      `/api/v1/businesses/${business_id}/reports/monthly-sales`,
      { params }
    );
    return response.data.data;
  },

  async getOutstandingReport(business_id: string): Promise<OutstandingReport> {
    const response = await apiClient.get<ApiResponse<OutstandingReport>>(
      `/api/v1/businesses/${business_id}/reports/outstanding`
    );
    return response.data.data;
  },

  async getGstSummaryReport(
    business_id: string,
    params?: DateRangeParams & {
      invoice_type?: 'sales' | 'purchase' | 'credit_note' | 'debit_note';
    }
  ): Promise<GstSummaryReport> {
    const response = await apiClient.get<ApiResponse<GstSummaryReport>>(
      `/api/v1/businesses/${business_id}/reports/gst-summary`,
      { params }
    );
    return response.data.data;
  },

  async getLowStockReport(business_id: string): Promise<LowStockReportItem[]> {
    const response = await apiClient.get<ApiResponse<LowStockReportItem[]>>(
      `/api/v1/businesses/${business_id}/reports/low-stock`
    );
    return response.data.data;
  },
};
