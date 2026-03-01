import apiClient from "@/lib/api-client";
import type {
  MonthlySalesReport,
  OutstandingReport,
  GstSummaryReport,
  LowStockItem,
} from "@/types/report";

export const reportService = {
  async getMonthlySales(
    businessId: string,
    params?: {
      from_date?: string;
      to_date?: string;
    }
  ): Promise<MonthlySalesReport[]> {
    const response = await apiClient.get(
      `/api/v1/businesses/${businessId}/reports/monthly-sales`,
      { params }
    );
    return response.data.data;
  },

  async getOutstanding(businessId: string): Promise<OutstandingReport> {
    const response = await apiClient.get(
      `/api/v1/businesses/${businessId}/reports/outstanding`
    );
    return response.data.data;
  },

  async getGstSummary(
    businessId: string,
    params?: {
      from_date?: string;
      to_date?: string;
      invoice_type?: "sales" | "purchase" | "credit_note" | "debit_note";
    }
  ): Promise<GstSummaryReport> {
    const response = await apiClient.get(
      `/api/v1/businesses/${businessId}/reports/gst-summary`,
      { params }
    );
    return response.data.data;
  },

  async getLowStock(businessId: string): Promise<LowStockItem[]> {
    const response = await apiClient.get(
      `/api/v1/businesses/${businessId}/reports/low-stock`
    );
    return response.data.data;
  },

  async exportMonthlySales(
    businessId: string,
    format: "csv" | "excel",
    params?: { from_date?: string; to_date?: string }
  ): Promise<Blob> {
    const response = await apiClient.get(
      `/api/v1/businesses/${businessId}/reports/monthly-sales/export`,
      {
        params: { ...params, format },
        responseType: "blob",
      }
    );
    return response.data;
  },

  async exportOutstanding(
    businessId: string,
    format: "csv" | "excel"
  ): Promise<Blob> {
    const response = await apiClient.get(
      `/api/v1/businesses/${businessId}/reports/outstanding/export`,
      {
        params: { format },
        responseType: "blob",
      }
    );
    return response.data;
  },

  async exportGstSummary(
    businessId: string,
    format: "csv" | "excel",
    params?: {
      from_date?: string;
      to_date?: string;
      invoice_type?: "sales" | "purchase" | "credit_note" | "debit_note";
    }
  ): Promise<Blob> {
    const response = await apiClient.get(
      `/api/v1/businesses/${businessId}/reports/gst-summary/export`,
      {
        params: { ...params, format },
        responseType: "blob",
      }
    );
    return response.data;
  },

  async exportLowStock(
    businessId: string,
    format: "csv" | "excel"
  ): Promise<Blob> {
    const response = await apiClient.get(
      `/api/v1/businesses/${businessId}/reports/low-stock/export`,
      {
        params: { format },
        responseType: "blob",
      }
    );
    return response.data;
  },
};
