import apiClient from "@/lib/api-client";
import type {
  Invoice,
  InvoiceWithItems,
  CreateInvoiceInput,
  CreateInvoiceNoteInput,
  ListInvoicesQuery,
  CancelInvoiceInput,
} from "@/types/invoice";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface PublicInvoicePayload {
  invoice: InvoiceWithItems;
  business: Record<string, unknown> | null;
  party: Record<string, unknown> | null;
  invoice_settings: Record<string, unknown> | null;
}

// Transform API response to ensure numeric fields are numbers
function transformInvoice(invoice: any): Invoice {
  return {
    ...invoice,
    subtotal: typeof invoice.subtotal === 'string' ? parseFloat(invoice.subtotal) : invoice.subtotal,
    total_discount: typeof invoice.total_discount === 'string' ? parseFloat(invoice.total_discount) : invoice.total_discount,
    taxable_amount: typeof invoice.taxable_amount === 'string' ? parseFloat(invoice.taxable_amount) : invoice.taxable_amount,
    cgst_amount: typeof invoice.cgst_amount === 'string' ? parseFloat(invoice.cgst_amount) : invoice.cgst_amount,
    sgst_amount: typeof invoice.sgst_amount === 'string' ? parseFloat(invoice.sgst_amount) : invoice.sgst_amount,
    igst_amount: typeof invoice.igst_amount === 'string' ? parseFloat(invoice.igst_amount) : invoice.igst_amount,
    total_tax: typeof invoice.total_tax === 'string' ? parseFloat(invoice.total_tax) : invoice.total_tax,
    round_off: typeof invoice.round_off === 'string' ? parseFloat(invoice.round_off) : invoice.round_off,
    grand_total: typeof invoice.grand_total === 'string' ? parseFloat(invoice.grand_total) : invoice.grand_total,
    amount_paid: typeof invoice.amount_paid === 'string' ? parseFloat(invoice.amount_paid) : invoice.amount_paid,
    balance_due: typeof invoice.balance_due === 'string' ? parseFloat(invoice.balance_due) : invoice.balance_due,
  };
}

function transformInvoiceWithItems(invoice: any): InvoiceWithItems {
  return {
    ...transformInvoice(invoice),
    items: invoice.items?.map((item: any) => ({
      ...item,
      quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity,
      unit_price: typeof item.unit_price === 'string' ? parseFloat(item.unit_price) : item.unit_price,
      discount_pct: typeof item.discount_pct === 'string' ? parseFloat(item.discount_pct) : item.discount_pct,
      discount_amount: typeof item.discount_amount === 'string' ? parseFloat(item.discount_amount) : item.discount_amount,
      taxable_value: typeof item.taxable_value === 'string' ? parseFloat(item.taxable_value) : item.taxable_value,
      gst_rate: typeof item.gst_rate === 'string' ? parseFloat(item.gst_rate) : item.gst_rate,
      cgst_rate: typeof item.cgst_rate === 'string' ? parseFloat(item.cgst_rate) : item.cgst_rate,
      sgst_rate: typeof item.sgst_rate === 'string' ? parseFloat(item.sgst_rate) : item.sgst_rate,
      igst_rate: typeof item.igst_rate === 'string' ? parseFloat(item.igst_rate) : item.igst_rate,
      cgst_amount: typeof item.cgst_amount === 'string' ? parseFloat(item.cgst_amount) : item.cgst_amount,
      sgst_amount: typeof item.sgst_amount === 'string' ? parseFloat(item.sgst_amount) : item.sgst_amount,
      igst_amount: typeof item.igst_amount === 'string' ? parseFloat(item.igst_amount) : item.igst_amount,
      total_amount: typeof item.total_amount === 'string' ? parseFloat(item.total_amount) : item.total_amount,
    })) || [],
  };
}

export const invoiceService = {
  async listInvoices(
    businessId: string,
    query?: ListInvoicesQuery
  ): Promise<PaginatedResponse<Invoice>> {
    const params = new URLSearchParams();
    
    if (query?.party_id) params.append("party_id", query.party_id);
    if (query?.payment_status) params.append("payment_status", query.payment_status);
    if (query?.invoice_type) params.append("invoice_type", query.invoice_type);
    if (query?.from_date) params.append("from_date", query.from_date);
    if (query?.to_date) params.append("to_date", query.to_date);
    if (query?.search) params.append("search", query.search);
    if (query?.include_cancelled !== undefined) params.append("include_cancelled", String(query.include_cancelled));
    if (query?.page) params.append("page", String(query.page));
    if (query?.limit) params.append("limit", String(query.limit));

    const url = `/api/v1/businesses/${businessId}/invoices${params.toString() ? `?${params.toString()}` : ""}`;
    const response = await apiClient.get<ApiResponse<PaginatedResponse<any>>>(url);
    
    return {
      ...response.data.data,
      items: response.data.data.items.map(transformInvoice),
    };
  },

  async getInvoice(businessId: string, invoiceId: string): Promise<InvoiceWithItems> {
    const response = await apiClient.get<ApiResponse<any>>(
      `/api/v1/businesses/${businessId}/invoices/${invoiceId}`
    );
    return transformInvoiceWithItems(response.data.data);
  },

  async createSalesInvoice(data: CreateInvoiceInput): Promise<InvoiceWithItems> {
    const response = await apiClient.post<ApiResponse<any>>(
      `/api/v1/invoices/sales`,
      data
    );
    return transformInvoiceWithItems(response.data.data);
  },

  async createPurchaseInvoice(data: CreateInvoiceInput): Promise<InvoiceWithItems> {
    const response = await apiClient.post<ApiResponse<any>>(
      `/api/v1/invoices/purchase`,
      data
    );
    return transformInvoiceWithItems(response.data.data);
  },

  async cancelInvoice(
    businessId: string,
    invoiceId: string,
    data: CancelInvoiceInput
  ): Promise<Invoice> {
    const response = await apiClient.post<ApiResponse<any>>(
      `/api/v1/businesses/${businessId}/invoices/${invoiceId}/cancel`,
      data
    );
    return transformInvoice(response.data.data);
  },

  async downloadPdf(businessId: string, invoiceId: string, template?: string): Promise<Blob> {
    const params = template ? `?template=${template}` : "";
    const response = await apiClient.get(
      `/api/v1/businesses/${businessId}/invoices/${invoiceId}/pdf${params}`,
      { responseType: 'blob' }
    );
    return response.data;
  },

  async sendInvoiceEmail(
    businessId: string,
    invoiceId: string,
    recipientEmail: string
  ): Promise<{ invoice_id: string; invoice_number: string; recipient_email: string; sent_at: string }> {
    const response = await apiClient.post<ApiResponse<{ invoice_id: string; invoice_number: string; recipient_email: string; sent_at: string }>>(
      `/api/v1/businesses/${businessId}/invoices/${invoiceId}/email`,
      { recipient_email: recipientEmail }
    );
    return response.data.data;
  },

  async testEmailConfig(testEmail?: string): Promise<{ recipient: string; sent_at: string }> {
    const response = await apiClient.post<ApiResponse<{ recipient: string; sent_at: string }>>(
      `/api/v1/email/test`,
      testEmail ? { test_email: testEmail } : {}
    );
    return response.data.data;
  },

  async getShareLink(businessId: string, invoiceId: string): Promise<{ share_url: string; expires_at: string }> {
    const response = await apiClient.post<ApiResponse<{ share_url: string; expires_at: string }>>(
      `/api/v1/businesses/${businessId}/invoices/${invoiceId}/share`
    );
    return response.data.data;
  },

  async getPublicInvoice(invoiceId: string, token: string): Promise<PublicInvoicePayload> {
    const response = await apiClient.get<ApiResponse<any>>(
      `/api/v1/public/invoices/${invoiceId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return {
      ...response.data.data,
      invoice: transformInvoiceWithItems(response.data.data.invoice),
    };
  },

  async createInvoiceNote(
    businessId: string,
    invoiceId: string,
    data: CreateInvoiceNoteInput
  ): Promise<InvoiceWithItems> {
    const response = await apiClient.post<ApiResponse<any>>(
      `/api/v1/businesses/${businessId}/invoices/${invoiceId}/notes`,
      data
    );
    return transformInvoiceWithItems(response.data.data);
  },
};
