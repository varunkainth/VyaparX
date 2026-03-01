import apiClient from "@/lib/api-client";
import type {
  Payment,
  PaymentWithAllocations,
  RecordPaymentInput,
  ListPaymentsQuery,
  ReconcilePaymentInput,
} from "@/types/payment";

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

// Transform API response to ensure numeric fields are numbers
function transformPayment(payment: any): Payment {
  return {
    ...payment,
    amount: typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount,
  };
}

function transformPaymentWithAllocations(payment: any): PaymentWithAllocations {
  return {
    ...transformPayment(payment),
    allocations: payment.allocations?.map((alloc: any) => ({
      ...alloc,
      allocated_amount: typeof alloc.allocated_amount === 'string' 
        ? parseFloat(alloc.allocated_amount) 
        : alloc.allocated_amount,
    })) || [],
  };
}

export const paymentService = {
  async listPayments(
    businessId: string,
    query?: ListPaymentsQuery
  ): Promise<PaginatedResponse<Payment>> {
    const params = new URLSearchParams();
    
    if (query?.party_id) params.append("party_id", query.party_id);
    if (query?.payment_type) params.append("payment_type", query.payment_type);
    if (query?.payment_mode) params.append("payment_mode", query.payment_mode);
    if (query?.is_reconciled !== undefined) params.append("is_reconciled", String(query.is_reconciled));
    if (query?.from_date) params.append("from_date", query.from_date);
    if (query?.to_date) params.append("to_date", query.to_date);
    if (query?.page) params.append("page", String(query.page));
    if (query?.limit) params.append("limit", String(query.limit));

    const url = `/api/v1/businesses/${businessId}/payments${params.toString() ? `?${params.toString()}` : ""}`;
    const response = await apiClient.get<ApiResponse<PaginatedResponse<any>>>(url);
    
    return {
      ...response.data.data,
      items: response.data.data.items.map(transformPayment),
    };
  },

  async getPayment(businessId: string, paymentId: string): Promise<PaymentWithAllocations> {
    const response = await apiClient.get<ApiResponse<any>>(
      `/api/v1/businesses/${businessId}/payments/${paymentId}`
    );
    return transformPaymentWithAllocations(response.data.data);
  },

  async recordPayment(data: RecordPaymentInput): Promise<PaymentWithAllocations> {
    const response = await apiClient.post<ApiResponse<any>>(
      `/api/v1/payments`,
      data
    );
    return transformPaymentWithAllocations(response.data.data);
  },

  async reconcilePayment(
    businessId: string,
    paymentId: string,
    data: ReconcilePaymentInput
  ): Promise<Payment> {
    const response = await apiClient.post<ApiResponse<any>>(
      `/api/v1/businesses/${businessId}/payments/${paymentId}/reconcile`,
      data
    );
    return transformPayment(response.data.data);
  },

  async unreconcilePayment(businessId: string, paymentId: string): Promise<Payment> {
    const response = await apiClient.post<ApiResponse<any>>(
      `/api/v1/businesses/${businessId}/payments/${paymentId}/unreconcile`,
      {}
    );
    return transformPayment(response.data.data);
  },
};
