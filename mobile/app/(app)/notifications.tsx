import * as React from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Check,
  CheckCircle,
  ChevronRight,
  FileText,
  Info,
  Package,
  Settings2,
  Trash2,
  Wallet,
} from "lucide-react-native";

import { SubpageHeader } from "@/components/subpage-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { ToastBanner, useTimedToast } from "@/components/ui/toast-banner";
import { formatShortDate } from "@/lib/formatters";
import { useNotifications } from "@/hooks/use-notifications";
import { mapNotificationLink } from "@/lib/notification-routing";
import type { Notification, NotificationPriority, NotificationType } from "@/types/notification";

const notificationMeta: Record<NotificationType, { icon: typeof Bell; tone: string }> = {
  stock_alert: { icon: Package, tone: "text-primary" },
  low_stock: { icon: AlertTriangle, tone: "text-amber-600" },
  out_of_stock: { icon: AlertTriangle, tone: "text-destructive" },
  payment_due: { icon: Wallet, tone: "text-primary" },
  invoice_overdue: { icon: FileText, tone: "text-destructive" },
  payment_received: { icon: CheckCircle, tone: "text-emerald-600" },
  system: { icon: Info, tone: "text-primary" },
  info: { icon: Info, tone: "text-foreground" },
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { message, showToast } = useTimedToast();
  const [filter, setFilter] = React.useState<"all" | "unread">("all");
  const [error, setError] = React.useState<string | null>(null);
  const [pendingClear, setPendingClear] = React.useState<Notification | null>(null);
  const {
    notifications,
    stats,
    markAsRead,
    markAllAsRead,
    clearNotification,
    refresh,
  } = useNotifications();
  const filteredNotifications = React.useMemo(
    () => (filter === "unread" ? notifications.filter((item) => !item.read) : notifications),
    [filter, notifications],
  );
  const groupedNotifications = React.useMemo(() => groupNotifications(filteredNotifications), [filteredNotifications]);
  const headline =
    stats.unread > 0
      ? `${stats.unread} unread alert${stats.unread === 1 ? "" : "s"} need attention`
      : "Everything is read and up to date";

  async function onMarkAllAsRead() {
    if (stats.unread === 0) {
      return;
    }
    try {
      await markAllAsRead();
      showToast("All notifications marked as read.");
    } catch {
      setError("Unable to mark all notifications as read.");
    }
  }

  async function onNotificationPress(notification: Notification) {
    const nextHref = mapNotificationLink(notification);

    if (!notification.read) {
      try {
        await markAsRead(notification.id);
        showToast("Notification marked as read.");
      } catch {
        setError("Unable to mark notification as read.");
      }
    }

    if (nextHref) {
      router.push(nextHref);
    }
  }

  async function onClearNotification(notificationId: string) {
    try {
      await clearNotification(notificationId);
      showToast("Notification cleared.");
    } catch {
      setError("Unable to clear notification.");
    } finally {
      setPendingClear(null);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-6 pb-28 pt-4"
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => void refresh()} />}>
        <View className="gap-6">
          <SubpageHeader
            backHref="/(app)/more"
            eyebrow="Notifications"
            subtitle="Track stock alerts, overdue invoice warnings, and payment updates for the active business."
            title="Alerts center"
          />

          <Card className="overflow-hidden rounded-[30px] border-border bg-card">
            <View className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/10" />
            <View className="absolute -left-8 bottom-0 h-20 w-20 rounded-full bg-secondary/70" />
            <CardHeader>
              <CardTitle>Notification overview</CardTitle>
              <CardDescription>{headline}</CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              <View className="flex-row flex-wrap gap-3">
                <OverviewStat label="Unread" value={stats.unread} tone="primary" />
                <OverviewStat label="Urgent" value={stats.by_priority.urgent} tone="destructive" />
                <OverviewStat
                  label="Stock"
                  value={stats.by_type.low_stock + stats.by_type.out_of_stock}
                  tone="amber"
                />
                <OverviewStat label="Total" value={stats.total} tone="muted" />
              </View>
              <View className="flex-row gap-3">
                <FilterChip label="All alerts" selected={filter === "all"} onPress={() => setFilter("all")} />
                <FilterChip
                  label={`Unread${stats.unread ? ` (${stats.unread})` : ""}`}
                  selected={filter === "unread"}
                  onPress={() => setFilter("unread")}
                />
              </View>
              <View className="flex-row gap-3">
                <Button
                  variant="outline"
                  className="h-12 flex-1 rounded-2xl"
                  disabled={stats.unread === 0}
                  onPress={onMarkAllAsRead}>
                  <Icon as={Check} className="text-foreground" size={16} />
                  <Text>Mark all read</Text>
                </Button>
                <Button
                  variant="outline"
                  className="h-12 flex-1 rounded-2xl"
                  onPress={() => router.push("/(app)/settings")}>
                  <Icon as={Settings2} className="text-foreground" size={16} />
                  <Text>Settings</Text>
                </Button>
              </View>
            </CardContent>
          </Card>

          {error ? (
            <Card className="rounded-[28px] border-destructive/20 bg-destructive/5">
              <CardContent className="gap-4 px-5 py-5">
                <Text className="font-semibold text-foreground">Notification sync failed</Text>
                <Text className="text-sm leading-6 text-muted-foreground">{error}</Text>
                <Button className="h-12 rounded-2xl" onPress={() => void refresh()}>
                  <Text>Retry</Text>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {filteredNotifications.length ? (
            groupedNotifications.map((group) => (
              <Card key={group.title} className="rounded-[28px]">
                <CardHeader>
                  <CardTitle>{group.title}</CardTitle>
                  <CardDescription>{group.items.length} notification(s)</CardDescription>
                </CardHeader>
                <CardContent className="gap-3">
                  {group.items.map((notification) => {
                    const meta = notificationMeta[notification.type];

                    return (
                      <Pressable
                        key={notification.id}
                        className={`rounded-[24px] border px-4 py-4 ${
                          notification.read
                            ? "border-border/70 bg-background"
                            : notification.priority === "urgent"
                              ? "border-destructive/20 bg-destructive/5"
                              : "border-primary/20 bg-primary/5"
                        }`}
                        onPress={() => void onNotificationPress(notification)}>
                        <View className="flex-row items-start gap-4">
                          <View className="rounded-2xl bg-primary/10 px-3 py-3">
                            <Icon as={meta.icon} className={meta.tone} size={18} />
                          </View>
                          <View className="flex-1 gap-2">
                            <View className="flex-row items-start justify-between gap-4">
                              <View className="flex-1 gap-1">
                                <Text className="font-semibold text-foreground">{notification.title}</Text>
                                <View className="flex-row flex-wrap gap-2">
                                  <StatusBadge label={formatPriority(notification.priority)} tone={priorityTone(notification.priority)} />
                                  <StatusBadge label={formatType(notification.type)} tone="slate" />
                                  {!notification.read ? <StatusBadge label="New" tone="blue" /> : null}
                                </View>
                              </View>
                              <Pressable
                                accessibilityRole="button"
                                className="rounded-full border border-destructive/20 bg-destructive/10 p-2.5"
                                onPress={() => setPendingClear(notification)}>
                                <Icon as={Trash2} className="text-destructive" size={16} />
                              </Pressable>
                            </View>
                            <Text className="text-sm leading-6 text-muted-foreground">{notification.message}</Text>
                            <View className="flex-row items-center justify-between gap-3">
                              <Text className="text-xs uppercase tracking-[1px] text-muted-foreground">
                                {formatRelativeTime(notification.created_at)} | {formatShortDate(notification.created_at)}
                              </Text>
                              {mapNotificationLink(notification) ? (
                                <View className="flex-row items-center gap-1">
                                  <Text className="text-xs font-semibold uppercase tracking-[1px] text-primary">
                                    Open
                                  </Text>
                                  <Icon as={ArrowRight} className="text-primary" size={14} />
                                </View>
                              ) : null}
                            </View>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="rounded-[28px]">
              <CardContent className="pt-6">
                <EmptyState filter={filter} />
              </CardContent>
            </Card>
          )}

          <Pressable
            accessibilityRole="button"
            className="flex-row items-center justify-between rounded-[26px] border border-border/70 bg-card px-5 py-4"
            onPress={() => router.push("/(app)/settings")}>
            <View className="flex-row items-center gap-4">
              <View className="rounded-2xl bg-primary/10 px-3 py-3">
                <Icon as={Settings2} className="text-primary" size={18} />
              </View>
              <View className="gap-1">
                <Text className="font-semibold text-foreground">Tune notification settings</Text>
                <Text className="text-sm text-muted-foreground">
                  Control which alerts stay visible in the app.
                </Text>
              </View>
            </View>
            <Icon as={ChevronRight} className="text-muted-foreground" size={18} />
          </Pressable>
        </View>
      </ScrollView>
      <AlertDialog open={!!pendingClear} onOpenChange={(open) => {
        if (!open) {
          setPendingClear(null);
        }
      }}>
        <AlertDialogContent className="rounded-[28px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Clear notification?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the selected notification from the alerts center.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Text>Cancel</Text>
            </AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onPress={() => {
              if (pendingClear) {
                void onClearNotification(pendingClear.id);
              }
            }}>
              <Text>Clear</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ToastBanner message={message} variant="success" />
    </SafeAreaView>
  );
}

function MiniPill({ label }: { label: string }) {
  return (
    <View className="min-w-[140px] flex-1 rounded-2xl border border-border/70 bg-background px-4 py-4">
      <Text className="font-medium text-foreground">{label}</Text>
    </View>
  );
}

function OverviewStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "destructive" | "muted" | "primary";
}) {
  const toneClass =
    tone === "destructive"
      ? "border-destructive/20 bg-destructive/5"
      : tone === "amber"
        ? "border-amber-500/20 bg-amber-500/5"
        : tone === "primary"
          ? "border-primary/20 bg-primary/5"
          : "border-border/70 bg-background";

  return (
    <View className={`min-w-[140px] flex-1 rounded-[22px] border px-4 py-4 ${toneClass}`}>
      <Text className="text-xs uppercase tracking-[1px] text-muted-foreground">{label}</Text>
      <Text className="mt-1 text-2xl font-bold text-foreground">{value}</Text>
    </View>
  );
}

function FilterChip({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      className={`rounded-[22px] border px-4 py-3 ${selected ? "border-primary bg-primary" : "border-border/70 bg-background"}`}
      onPress={onPress}>
      <Text className={selected ? "text-primary-foreground" : "text-foreground"}>{label}</Text>
    </Pressable>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "amber" | "blue" | "emerald" | "red" | "slate";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
      : tone === "red"
        ? "border-destructive/30 bg-destructive/10 text-destructive"
        : tone === "amber"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
          : tone === "blue"
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-border/80 bg-muted/30 text-muted-foreground";

  return (
    <View className={`rounded-full border px-3 py-1 ${toneClass}`}>
      <Text className="text-xs font-semibold uppercase tracking-[1px]">{label}</Text>
    </View>
  );
}

function EmptyState({ filter }: { filter: "all" | "unread" }) {
  return (
    <View className="items-center gap-4 rounded-[28px] border border-dashed border-border/70 bg-muted/20 px-6 py-8">
      <View className="rounded-[24px] bg-primary/10 px-4 py-4">
        <Icon as={Bell} className="text-primary" size={24} />
      </View>
      <View className="items-center gap-2">
        <Text className="text-lg font-semibold text-foreground">
          {filter === "unread" ? "No unread notifications" : "No notifications yet"}
        </Text>
        <Text className="text-center text-sm leading-6 text-muted-foreground">
          {filter === "unread" ? "You're caught up for now." : "Alerts will appear here when the backend creates them."}
        </Text>
      </View>
    </View>
  );
}

function formatPriority(priority: NotificationPriority) {
  if (priority === "urgent") return "Urgent";
  if (priority === "high") return "High";
  if (priority === "medium") return "Medium";
  return "Low";
}

function priorityTone(priority: NotificationPriority) {
  if (priority === "urgent") return "red";
  if (priority === "high") return "amber";
  if (priority === "medium") return "blue";
  return "slate";
}

function formatType(type: NotificationType) {
  if (type === "low_stock") return "Low stock";
  if (type === "out_of_stock") return "Out of stock";
  if (type === "payment_due") return "Payment due";
  if (type === "invoice_overdue") return "Invoice overdue";
  if (type === "payment_received") return "Payment received";
  if (type === "stock_alert") return "Stock alert";
  return type === "system" ? "System" : "Info";
}

function formatRelativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));

  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function groupNotifications(items: Notification[]) {
  const now = new Date();
  const today = now.toDateString();
  const urgent = items.filter((item) => item.priority === "urgent");
  const rest = items.filter((item) => item.priority !== "urgent");
  const todayItems = rest.filter((item) => new Date(item.created_at).toDateString() === today);
  const earlierItems = rest.filter((item) => new Date(item.created_at).toDateString() !== today);
  return [
    ...(urgent.length ? [{ title: "Urgent", items: urgent }] : []),
    ...(todayItems.length ? [{ title: "Today", items: todayItems }] : []),
    ...(earlierItems.length ? [{ title: "Earlier", items: earlierItems }] : []),
  ];
}
