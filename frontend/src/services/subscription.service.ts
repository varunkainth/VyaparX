import apiClient from "@/lib/api-client";
import type {
  CreateSubscriptionSessionInput,
  CreateSubscriptionSessionResponse,
  SubscriptionPaymentHistoryItem,
  SubscriptionStatus,
} from "@/types/subscription";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const subscriptionService = {
  async createSession(
    input: CreateSubscriptionSessionInput,
  ): Promise<CreateSubscriptionSessionResponse> {
    const response = await apiClient.post<ApiResponse<CreateSubscriptionSessionResponse>>(
      "/api/v1/subscriptions/create-session",
      input,
    );
    return response.data.data;
  },

  async getStatus(): Promise<SubscriptionStatus | null> {
    const response = await apiClient.get<ApiResponse<SubscriptionStatus | null>>(
      "/api/v1/subscriptions/status",
    );
    return response.data.data;
  },

  async getHistory(): Promise<SubscriptionPaymentHistoryItem[]> {
    const response = await apiClient.get<ApiResponse<SubscriptionPaymentHistoryItem[]>>(
      "/api/v1/subscriptions/payments",
    );
    return response.data.data;
  },

  async cancel(): Promise<void> {
    await apiClient.post("/api/v1/subscriptions/cancel");
  },
};
