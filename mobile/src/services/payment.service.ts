import apiClient from "../lib/api-client";
import type { ApiResponse } from "../types/auth";
import type {
  ListPaymentsQuery,
  Payment,
  PaymentAllocation,
  ReconcilePaymentInput,
  RecordPaymentInput,
  RecordPaymentResult,
  PaymentWithAllocations,
} from "../types/payment";

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

function transformPayment(payment: Payment): Payment {
  return {
    ...payment,
    amount: toNumber(payment.amount),
  };
}

function transformAllocation(allocation: PaymentAllocation): PaymentAllocation {
  return {
    ...allocation,
    allocated_amount: toNumber(allocation.allocated_amount),
  };
}

function transformPaymentWithAllocations(
  payment: PaymentWithAllocations,
): PaymentWithAllocations {
  return {
    ...transformPayment(payment),
    allocations: payment.allocations?.map(transformAllocation) ?? [],
  };
}

export const paymentService = {
  async listPayments(
    business_id: string,
    query?: ListPaymentsQuery,
  ): Promise<PaginatedResponse<Payment>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Payment>>>(
      `/api/v1/businesses/${business_id}/payments`,
      { params: query },
    );

    return {
      ...response.data.data,
      items: response.data.data.items.map(transformPayment),
    };
  },

  async getPayment(
    business_id: string,
    payment_id: string,
  ): Promise<PaymentWithAllocations> {
    const response = await apiClient.get<ApiResponse<PaymentWithAllocations>>(
      `/api/v1/businesses/${business_id}/payments/${payment_id}`,
    );

    return transformPaymentWithAllocations(response.data.data);
  },

  async recordPayment(payload: RecordPaymentInput): Promise<RecordPaymentResult> {
    const response = await apiClient.post<ApiResponse<RecordPaymentResult>>(
      "/api/v1/payments",
      payload,
    );

    return response.data.data;
  },

  async reconcilePayment(
    business_id: string,
    payment_id: string,
    payload: ReconcilePaymentInput,
  ): Promise<Payment> {
    const response = await apiClient.post<ApiResponse<Payment>>(
      `/api/v1/businesses/${business_id}/payments/${payment_id}/reconcile`,
      payload,
    );

    return transformPayment(response.data.data);
  },

  async unreconcilePayment(
    business_id: string,
    payment_id: string,
  ): Promise<Payment> {
    const response = await apiClient.post<ApiResponse<Payment>>(
      `/api/v1/businesses/${business_id}/payments/${payment_id}/unreconcile`,
      {},
    );

    return transformPayment(response.data.data);
  },
};
