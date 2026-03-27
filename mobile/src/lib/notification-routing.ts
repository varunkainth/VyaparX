import type { Notification } from "@/types/notification";

export function mapNotificationLink(notification: Notification) {
  const invoiceId = typeof notification.metadata?.invoice_id === "string" ? notification.metadata.invoice_id : undefined;
  const paymentId = typeof notification.metadata?.payment_id === "string" ? notification.metadata.payment_id : undefined;
  const itemId = typeof notification.metadata?.item_id === "string" ? notification.metadata.item_id : undefined;

  if (invoiceId) {
    return { pathname: "/(app)/invoice-detail" as const, params: { id: invoiceId } };
  }

  if (paymentId) {
    return { pathname: "/(app)/payment-detail" as const, params: { id: paymentId } };
  }

  if (itemId) {
    return { pathname: "/(app)/inventory-edit" as const, params: { id: itemId } };
  }

  if (!notification.link) {
    return null;
  }

  const link = notification.link.trim();
  const invoiceMatch = link.match(/^\/invoices\/([^/]+)$/);
  if (invoiceMatch?.[1]) {
    return { pathname: "/(app)/invoice-detail" as const, params: { id: invoiceMatch[1] } };
  }

  const paymentMatch = link.match(/^\/payments\/([^/]+)$/);
  if (paymentMatch?.[1]) {
    return { pathname: "/(app)/payment-detail" as const, params: { id: paymentMatch[1] } };
  }

  const inventoryMatch = link.match(/^\/inventory\/([^/]+)$/);
  if (inventoryMatch?.[1]) {
    return { pathname: "/(app)/inventory-edit" as const, params: { id: inventoryMatch[1] } };
  }

  return null;
}
