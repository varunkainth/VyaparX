import apiClient from "../lib/api-client";
import type { ApiResponse } from "../types/auth";
import type { Notification } from "../types/notification";

export const notificationService = {
  async listNotifications(businessId: string): Promise<Notification[]> {
    const response = await apiClient.get<ApiResponse<Notification[]>>(
      `/api/v1/businesses/${businessId}/notifications`,
    );

    return response.data.data;
  },

  async markAsRead(businessId: string, notificationId: string): Promise<Notification> {
    const response = await apiClient.post<ApiResponse<Notification>>(
      `/api/v1/businesses/${businessId}/notifications/${notificationId}/read`,
    );

    return response.data.data;
  },

  async markAllAsRead(businessId: string): Promise<void> {
    await apiClient.post(`/api/v1/businesses/${businessId}/notifications/read-all`);
  },

  async clearNotification(businessId: string, notificationId: string): Promise<void> {
    await apiClient.delete(`/api/v1/businesses/${businessId}/notifications/${notificationId}`);
  },
};
