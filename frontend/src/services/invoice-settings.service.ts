import apiClient from "@/lib/api-client";
import type { InvoiceSettings, UpdateInvoiceSettingsInput } from "@/types/invoice-settings";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const invoiceSettingsService = {
  async getSettings(businessId: string): Promise<InvoiceSettings> {
    const response = await apiClient.get<ApiResponse<InvoiceSettings>>(
      `/api/v1/businesses/${businessId}/invoice-settings`
    );
    return response.data.data;
  },

  async updateSettings(
    businessId: string,
    data: UpdateInvoiceSettingsInput
  ): Promise<InvoiceSettings> {
    const response = await apiClient.put<ApiResponse<InvoiceSettings>>(
      `/api/v1/businesses/${businessId}/invoice-settings`,
      data
    );
    return response.data.data;
  },

  async resetToDefaults(businessId: string): Promise<InvoiceSettings> {
    const response = await apiClient.post<ApiResponse<InvoiceSettings>>(
      `/api/v1/businesses/${businessId}/invoice-settings/reset`
    );
    return response.data.data;
  },
};
