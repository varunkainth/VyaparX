import apiClient from "../lib/api-client";
import type { ApiResponse } from "../types/auth";
import type { InvoiceSettings, UpdateInvoiceSettingsInput } from "../types/invoice-settings";

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

function transformInvoiceSettings(settings: InvoiceSettings): InvoiceSettings {
  return {
    ...settings,
    default_due_days: toNumber(settings.default_due_days),
    next_invoice_number: toNumber(settings.next_invoice_number),
    next_purchase_number: toNumber(settings.next_purchase_number),
  };
}

export const invoiceSettingsService = {
  async getSettings(business_id: string): Promise<InvoiceSettings> {
    const response = await apiClient.get<ApiResponse<InvoiceSettings>>(
      `/api/v1/businesses/${business_id}/invoice-settings`
    );

    return transformInvoiceSettings(response.data.data);
  },

  async updateSettings(
    business_id: string,
    payload: UpdateInvoiceSettingsInput
  ): Promise<InvoiceSettings> {
    const response = await apiClient.put<ApiResponse<InvoiceSettings>>(
      `/api/v1/businesses/${business_id}/invoice-settings`,
      payload
    );

    return transformInvoiceSettings(response.data.data);
  },

  async resetToDefaults(business_id: string): Promise<InvoiceSettings> {
    const response = await apiClient.post<ApiResponse<InvoiceSettings>>(
      `/api/v1/businesses/${business_id}/invoice-settings/reset`
    );

    return transformInvoiceSettings(response.data.data);
  },
};
