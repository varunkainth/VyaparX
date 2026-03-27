import * as React from "react";

import { restoreNotificationPreferences, persistNotificationPreferences } from "@/lib/notification-preferences";
import { notificationService } from "@/services/notification.service";
import { useAuthStore } from "@/store/auth-store";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type Notification,
  type NotificationPreferences,
  type NotificationStats,
} from "@/types/notification";

const EMPTY_STATS: NotificationStats = {
  total: 0,
  unread: 0,
  by_priority: {
    high: 0,
    low: 0,
    medium: 0,
    urgent: 0,
  },
  by_type: {
    info: 0,
    invoice_overdue: 0,
    low_stock: 0,
    out_of_stock: 0,
    payment_due: 0,
    payment_received: 0,
    stock_alert: 0,
    system: 0,
  },
};

function buildStats(items: Notification[]): NotificationStats {
  const stats: NotificationStats = {
    ...EMPTY_STATS,
    by_priority: { ...EMPTY_STATS.by_priority },
    by_type: { ...EMPTY_STATS.by_type },
    total: items.length,
    unread: items.filter((item) => !item.read).length,
  };

  for (const item of items) {
    stats.by_type[item.type] += 1;
    stats.by_priority[item.priority] += 1;
  }

  return stats;
}

export function useNotifications() {
  const { session } = useAuthStore();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [preferences, setPreferences] = React.useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [stats, setStats] = React.useState<NotificationStats>(EMPTY_STATS);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;

    const loadPreferences = async () => {
      const next = await restoreNotificationPreferences();
      if (active) {
        setPreferences(next);
      }
    };

    void loadPreferences();
    return () => {
      active = false;
    };
  }, []);

  const refresh = React.useCallback(async () => {
    if (!session?.business_id) {
      setNotifications([]);
      setStats(EMPTY_STATS);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      if (!preferences.enabled) {
        setNotifications([]);
        setStats(EMPTY_STATS);
        return;
      }

      const apiNotifications = await notificationService.listNotifications(session.business_id);
      const filtered = apiNotifications.filter((item) => preferences.types[item.type]);
      setNotifications(filtered);
      setStats(buildStats(filtered));
    } finally {
      setIsLoading(false);
    }
  }, [preferences, session?.business_id]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const updatePreferences = React.useCallback(async (next: NotificationPreferences) => {
    setPreferences(next);
    await persistNotificationPreferences(next);
  }, []);

  const markAsRead = React.useCallback(async (notificationId: string) => {
    if (!session?.business_id) {
      return;
    }

    setNotifications((current) => {
      const next = current.map((item) => (item.id === notificationId ? { ...item, read: true } : item));
      setStats(buildStats(next));
      return next;
    });

    try {
      await notificationService.markAsRead(session.business_id, notificationId);
    } catch {
      void refresh();
    }
  }, [refresh, session?.business_id]);

  const markAllAsRead = React.useCallback(async () => {
    if (!session?.business_id) {
      return;
    }

    setNotifications((current) => {
      const next = current.map((item) => ({ ...item, read: true }));
      setStats(buildStats(next));
      return next;
    });

    try {
      await notificationService.markAllAsRead(session.business_id);
    } catch {
      void refresh();
    }
  }, [refresh, session?.business_id]);

  const clearNotification = React.useCallback(async (notificationId: string) => {
    if (!session?.business_id) {
      return;
    }

    setNotifications((current) => {
      const next = current.filter((item) => item.id !== notificationId);
      setStats(buildStats(next));
      return next;
    });

    try {
      await notificationService.clearNotification(session.business_id, notificationId);
    } catch {
      void refresh();
    }
  }, [refresh, session?.business_id]);

  return {
    notifications,
    stats,
    isLoading,
    preferences,
    updatePreferences,
    markAsRead,
    markAllAsRead,
    clearNotification,
    refresh,
  };
}
