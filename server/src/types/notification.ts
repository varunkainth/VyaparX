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

export interface NotificationRecord {
    id: string;
    business_id: string;
    user_id: string;
    type: NotificationType;
    priority: NotificationPriority;
    title: string;
    message: string;
    link: string | null;
    metadata: Record<string, unknown> | null;
    read: boolean;
    dedupe_key: string | null;
    is_resolved: boolean;
    resolved_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateNotificationInput {
    business_id: string;
    user_id: string;
    type: NotificationType;
    priority: NotificationPriority;
    title: string;
    message: string;
    link?: string | null;
    metadata?: Record<string, unknown>;
    dedupe_key?: string | null;
}

export interface LowStockAlertContext {
    businessId: string;
    itemId: string;
    itemName: string;
    itemUnit: string | null;
    threshold: number;
    previousStock: number;
    currentStock: number;
    actorUserId?: string | null;
}
