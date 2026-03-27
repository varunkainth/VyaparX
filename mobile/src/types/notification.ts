export type NotificationType =
  | "stock_alert"
  | "payment_due"
  | "invoice_overdue"
  | "low_stock"
  | "out_of_stock"
  | "payment_received"
  | "system"
  | "info";

export type NotificationPriority = "low" | "medium" | "high" | "urgent";

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  link?: string | null;
  read: boolean;
  created_at: string;
  metadata?: {
    item_id?: string;
    item_name?: string;
    current_stock?: number;
    threshold?: number;
    invoice_id?: string;
    payment_id?: string;
    amount?: number;
    [key: string]: unknown;
  } | null;
}

export interface NotificationStats {
  total: number;
  unread: number;
  by_type: Record<NotificationType, number>;
  by_priority: Record<NotificationPriority, number>;
}

export interface NotificationPreferences {
  enabled: boolean;
  types: {
    stock_alert: boolean;
    payment_due: boolean;
    invoice_overdue: boolean;
    low_stock: boolean;
    out_of_stock: boolean;
    payment_received: boolean;
    system: boolean;
    info: boolean;
  };
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  types: {
    stock_alert: true,
    payment_due: true,
    invoice_overdue: true,
    low_stock: true,
    out_of_stock: true,
    payment_received: true,
    system: true,
    info: true,
  },
};
