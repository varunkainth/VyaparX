import apiClient from "../lib/api-client";
import { API_BASE_URL } from "../lib/env";
import type { ApiResponse } from "../types/auth";
import type {
  CancelInvoiceInput,
  CreateInvoiceInput,
  CreateInvoiceNoteInput,
  CreateInvoiceResult,
  Invoice,
  InvoiceItem,
  InvoiceWithItems,
  ListInvoicesQuery,
} from "../types/invoice";

interface PaginatedResponse<T> {
  items: T[];
  limit: number;
  page: number;
  total: number;
}

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

function transformInvoiceItem(item: InvoiceItem): InvoiceItem {
  return {
    ...item,
    quantity: toNumber(item.quantity),
    unit_price: toNumber(item.unit_price),
    discount_pct: toNumber(item.discount_pct),
    discount_amount: toNumber(item.discount_amount),
    taxable_value: toNumber(item.taxable_value),
    gst_rate: toNumber(item.gst_rate),
    cgst_rate: toNumber(item.cgst_rate),
    sgst_rate: toNumber(item.sgst_rate),
    igst_rate: toNumber(item.igst_rate),
    cgst_amount: toNumber(item.cgst_amount),
    sgst_amount: toNumber(item.sgst_amount),
    igst_amount: toNumber(item.igst_amount),
    total_amount: toNumber(item.total_amount),
  };
}

function transformInvoice(invoice: Invoice): Invoice {
  return {
    ...invoice,
    subtotal: toNumber(invoice.subtotal),
    total_discount: toNumber(invoice.total_discount),
    taxable_amount: toNumber(invoice.taxable_amount),
    cgst_amount: toNumber(invoice.cgst_amount),
    sgst_amount: toNumber(invoice.sgst_amount),
    igst_amount: toNumber(invoice.igst_amount),
    total_tax: toNumber(invoice.total_tax),
    round_off: toNumber(invoice.round_off),
    grand_total: toNumber(invoice.grand_total),
    amount_paid: toNumber(invoice.amount_paid),
    balance_due: toNumber(invoice.balance_due),
  };
}

function transformInvoiceWithItems(invoice: InvoiceWithItems): InvoiceWithItems {
  return {
    ...transformInvoice(invoice),
    items: invoice.items?.map(transformInvoiceItem) ?? [],
    payments:
      invoice.payments?.map((payment) => ({
        ...payment,
        allocated_amount: toNumber(payment.allocated_amount),
      })) ?? [],
  };
}

export const invoiceService = {
  async listInvoices(
    business_id: string,
    query?: ListInvoicesQuery,
  ): Promise<PaginatedResponse<Invoice>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Invoice>>>(
      `/api/v1/businesses/${business_id}/invoices`,
      {
        params: {
          ...query,
          include_cancelled:
            query?.include_cancelled == null
              ? undefined
              : String(query.include_cancelled),
        },
      },
    );

    return {
      ...response.data.data,
      items: response.data.data.items.map(transformInvoice),
    };
  },

  async getInvoice(
    business_id: string,
    invoice_id: string,
  ): Promise<InvoiceWithItems> {
    const response = await apiClient.get<ApiResponse<InvoiceWithItems>>(
      `/api/v1/businesses/${business_id}/invoices/${invoice_id}`,
    );

    return transformInvoiceWithItems(response.data.data);
  },

  async createSalesInvoice(payload: CreateInvoiceInput): Promise<CreateInvoiceResult> {
    const response = await apiClient.post<ApiResponse<CreateInvoiceResult>>(
      "/api/v1/invoices/sales",
      payload,
    );

    return response.data.data;
  },

  async createPurchaseInvoice(payload: CreateInvoiceInput): Promise<CreateInvoiceResult> {
    const response = await apiClient.post<ApiResponse<CreateInvoiceResult>>(
      "/api/v1/invoices/purchase",
      payload,
    );

    return response.data.data;
  },

  async createInvoiceNote(
    business_id: string,
    invoice_id: string,
    payload: CreateInvoiceNoteInput,
  ): Promise<CreateInvoiceResult> {
    const response = await apiClient.post<ApiResponse<CreateInvoiceResult>>(
      `/api/v1/businesses/${business_id}/invoices/${invoice_id}/notes`,
      payload,
    );

    return response.data.data;
  },

  async cancelInvoice(
    business_id: string,
    invoice_id: string,
    payload: CancelInvoiceInput,
  ): Promise<Invoice> {
    const response = await apiClient.post<ApiResponse<Invoice>>(
      `/api/v1/businesses/${business_id}/invoices/${invoice_id}/cancel`,
      payload,
    );

    return transformInvoice(response.data.data);
  },

  async createInvoiceShareLink(
    business_id: string,
    invoice_id: string,
  ): Promise<{ share_url: string; expires_at: string }> {
    const response = await apiClient.post<
      ApiResponse<{ share_url: string; expires_at: string }>
    >(`/api/v1/businesses/${business_id}/invoices/${invoice_id}/share`);

    return response.data.data;
  },

  async sendInvoiceEmail(
    business_id: string,
    invoice_id: string,
    recipient_email: string,
  ): Promise<{
    invoice_id: string;
    invoice_number: string;
    recipient_email: string;
    sent_at: string;
  }> {
    const response = await apiClient.post<
      ApiResponse<{
        invoice_id: string;
        invoice_number: string;
        recipient_email: string;
        sent_at: string;
      }>
    >(`/api/v1/businesses/${business_id}/invoices/${invoice_id}/email`, {
      recipient_email,
    });

    return response.data.data;
  },

  buildPublicInvoicePdfUrl(shareUrl: string, invoiceId: string) {
    const token = extractShareToken(shareUrl);
    if (!token) {
      throw new Error("Unable to derive invoice share token.");
    }

    return `${API_BASE_URL}/api/v1/public/invoices/${invoiceId}/pdf?token=${encodeURIComponent(token)}`;
  },
};

function extractShareToken(shareUrl: string) {
  const hashIndex = shareUrl.indexOf("#");
  if (hashIndex === -1) {
    return null;
  }

  const hash = shareUrl.slice(hashIndex + 1);
  const params = new URLSearchParams(hash);
  return params.get("token");
}
