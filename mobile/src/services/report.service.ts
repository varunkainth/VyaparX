import apiClient from '../lib/api-client';
import type { ApiResponse } from '../types/auth';
import type {
  GstSummaryReport,
  LowStockReportItem,
  MonthlySalesReportItem,
  OutstandingReport,
  ProfitLossReport,
  PurchaseReport,
} from '../types/report';

interface DateRangeParams {
  from_date?: string;
  to_date?: string;
}

export type ReportExportFormat = 'csv' | 'excel';

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

  async getPurchaseReport(
    business_id: string,
    params?: DateRangeParams
  ): Promise<PurchaseReport> {
    const response = await apiClient.get<ApiResponse<PurchaseReport>>(
      `/api/v1/businesses/${business_id}/reports/purchase`,
      { params }
    );
    return response.data.data;
  },

  async getProfitLossReport(
    business_id: string,
    params?: DateRangeParams
  ): Promise<ProfitLossReport> {
    const response = await apiClient.get<ApiResponse<ProfitLossReport>>(
      `/api/v1/businesses/${business_id}/reports/profit-loss`,
      { params }
    );
    return response.data.data;
  },

  async exportMonthlySalesReport(
    business_id: string,
    format: ReportExportFormat,
    params?: DateRangeParams
  ): Promise<ArrayBuffer> {
    const response = await apiClient.get<ArrayBuffer>(
      `/api/v1/businesses/${business_id}/reports/monthly-sales/export`,
      {
        params: { ...params, format },
        responseType: 'arraybuffer',
      }
    );

    return response.data;
  },

  async exportOutstandingReport(
    business_id: string,
    format: ReportExportFormat
  ): Promise<ArrayBuffer> {
    const response = await apiClient.get<ArrayBuffer>(
      `/api/v1/businesses/${business_id}/reports/outstanding/export`,
      {
        params: { format },
        responseType: 'arraybuffer',
      }
    );

    return response.data;
  },

  async exportGstSummaryReport(
    business_id: string,
    format: ReportExportFormat,
    params?: DateRangeParams & {
      invoice_type?: 'sales' | 'purchase' | 'credit_note' | 'debit_note';
    }
  ): Promise<ArrayBuffer> {
    const response = await apiClient.get<ArrayBuffer>(
      `/api/v1/businesses/${business_id}/reports/gst-summary/export`,
      {
        params: { ...params, format },
        responseType: 'arraybuffer',
      }
    );

    return response.data;
  },

  async exportLowStockReport(
    business_id: string,
    format: ReportExportFormat
  ): Promise<ArrayBuffer> {
    const response = await apiClient.get<ArrayBuffer>(
      `/api/v1/businesses/${business_id}/reports/low-stock/export`,
      {
        params: { format },
        responseType: 'arraybuffer',
      }
    );

    return response.data;
  },

  async exportPurchaseReport(
    business_id: string,
    format: ReportExportFormat,
    params?: DateRangeParams
  ): Promise<ArrayBuffer> {
    const response = await apiClient.get<ArrayBuffer>(
      `/api/v1/businesses/${business_id}/reports/purchase/export`,
      {
        params: { ...params, format },
        responseType: 'arraybuffer',
      }
    );

    return response.data;
  },

  async exportProfitLossReport(
    business_id: string,
    format: ReportExportFormat,
    params?: DateRangeParams
  ): Promise<ArrayBuffer> {
    const response = await apiClient.get<ArrayBuffer>(
      `/api/v1/businesses/${business_id}/reports/profit-loss/export`,
      {
        params: { ...params, format },
        responseType: 'arraybuffer',
      }
    );

    return response.data;
  },
};
