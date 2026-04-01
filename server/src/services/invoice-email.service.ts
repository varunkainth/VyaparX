import { emailService } from "../config/email";
import { ERROR_CODES } from "../constants/errorCodes";
import { businessRepository } from "../repository/business.repository";
import { invoiceRepository } from "../repository/invoice.repository";
import { invoiceSettingsRepository } from "../repository/invoice-settings.repository";
import { partyRepository } from "../repository/party.repository";
import type { InvoicePdfTemplate } from "../types/invoice";
import { AppError } from "../utils/appError";
import { generateInvoicePdf } from "../utils/invoicePdf";
import {
  ensureInvoicePdfStored,
  getStoredInvoicePdfBuffer,
} from "./invoice-pdf-storage.service";
import { isR2StorageEnabled } from "./storage.service";

export type SendInvoiceEmailJobData = {
  business_id: string;
  invoice_id: string;
  recipient_email: string;
  requested_by_user_id: string;
};

const templateMap: Record<string, InvoicePdfTemplate> = {
  default: "bill_pro",
  modern: "modern",
  classic: "classic",
  minimal: "compact",
};

export const sendInvoiceEmailNow = async ({
  business_id,
  invoice_id,
  recipient_email,
  requested_by_user_id,
}: SendInvoiceEmailJobData) => {
  if (!emailService.isReady()) {
    throw new AppError(
      "Email service is not configured. Please contact administrator.",
      503,
      ERROR_CODES.BAD_REQUEST,
    );
  }

  const [invoice, items] = await Promise.all([
    invoiceRepository.getInvoiceById(business_id, invoice_id),
    invoiceRepository.getInvoiceItems(invoice_id),
  ]);

  if (!invoice) {
    throw new AppError("Invoice not found", 404, ERROR_CODES.INVOICE_NOT_FOUND);
  }

  const invoiceWithItems = {
    ...invoice,
    items,
  };

  const [business, party, invoiceSettings] = await Promise.all([
    businessRepository.getBusinessForUser(business_id, requested_by_user_id),
    partyRepository.getPartyById(business_id, String(invoice.party_id)),
    invoiceSettingsRepository.getOrCreate(business_id),
  ]);

  if (!business) {
    throw new AppError("Business not found", 404, ERROR_CODES.NOT_FOUND);
  }

  const template = templateMap[invoiceSettings.default_template] || "bill_pro";

  let pdfBuffer: Buffer;
  if (isR2StorageEnabled()) {
    await ensureInvoicePdfStored(business_id, invoice_id);

    let storedBuffer: Buffer | null = null;
    try {
      storedBuffer = await getStoredInvoicePdfBuffer(business_id, invoice_id);
    } catch (err) {
      console.warn(
        "[invoice-email] R2 download failed, falling back to regenerating PDF:",
        err,
      );
    }

    pdfBuffer =
      storedBuffer ??
      (await generateInvoicePdf({
        businessName: business.name,
        partyName: party?.name ?? "Customer",
        invoice: invoiceWithItems,
        template,
        business: business as Record<string, unknown>,
        party: (party as Record<string, unknown> | null) ?? undefined,
      }));
  } else {
    pdfBuffer = await generateInvoicePdf({
      businessName: business.name,
      partyName: party?.name ?? "Customer",
      invoice: invoiceWithItems,
      template,
      business: business as Record<string, unknown>,
      party: (party as Record<string, unknown> | null) ?? undefined,
    });
  }

  const amount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(Number(invoice.grand_total));

  await emailService.sendInvoiceEmail({
    to: recipient_email,
    invoiceNumber: String(invoice.invoice_number),
    businessName: business.name,
    amount,
    pdfBuffer,
  });

  return {
    invoice_id,
    invoice_number: String(invoice.invoice_number),
    recipient_email,
    sent_at: new Date().toISOString(),
  };
};
