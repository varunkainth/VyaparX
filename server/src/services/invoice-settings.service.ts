import { invoiceSettingsRepository } from "../repository/invoice-settings.repository";
import type { InvoiceSettings, UpdateInvoiceSettingsInput } from "../types/invoice-settings";

export async function getInvoiceSettings(businessId: string): Promise<InvoiceSettings> {
    return await invoiceSettingsRepository.getOrCreate(businessId);
}

export async function updateInvoiceSettings(
    businessId: string,
    data: UpdateInvoiceSettingsInput
): Promise<InvoiceSettings> {
    return await invoiceSettingsRepository.update(businessId, data);
}

export async function resetInvoiceSettings(businessId: string): Promise<InvoiceSettings> {
    return await invoiceSettingsRepository.resetToDefaults(businessId);
}
