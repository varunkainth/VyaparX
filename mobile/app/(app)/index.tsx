import * as React from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowUpRight,
  BadgeIndianRupee,
  Bell,
  Building2,
  ChartColumnBig,
  CirclePlus,
  ChevronRight,
  Repeat,
  Settings2,
  PackageCheck,
  ReceiptText,
  Users,
} from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DevCacheIndicator } from '@/components/dev-cache-indicator';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { CACHE_TTL_MS, formatCacheAge, isCacheStale } from '@/lib/cache-policy';
import { formatCompactNumber, formatCurrency, formatPercent, formatShortDate } from '@/lib/formatters';
import { useNotifications } from '@/hooks/use-notifications';
import { dashboardService } from '@/services/dashboard.service';
import { useAuthStore } from '@/store/auth-store';
import { useBusinessStore } from '@/store/business-store';
import { useDashboardStore } from '@/store/dashboard-store';
import type { DashboardData } from '@/types/dashboard';

export default function HomeScreen() {
  const router = useRouter();
  const { session, user } = useAuthStore();
  const {
    businesses,
    currentBusiness,
    ensureBusinesses,
    error: businessError,
    isSwitchingBusinessId,
    switchBusiness,
  } = useBusinessStore();
  const ensureDashboard = useDashboardStore((state) => state.ensureDashboard);
  const dashboard = useDashboardStore((state) => (session?.business_id ? state.dataByBusinessId[session.business_id] ?? null : null));
  const dashboardError = useDashboardStore((state) => (session?.business_id ? state.errorByBusinessId[session.business_id] ?? null : null));
  const dashboardStatus = useDashboardStore((state) => (session?.business_id ? state.statusByBusinessId[session.business_id] ?? 'idle' : 'idle'));
  const dashboardUpdatedAt = useDashboardStore((state) => (session?.business_id ? state.updatedAtByBusinessId[session.business_id] ?? null : null));
  const { stats: notificationStats, refresh } = useNotifications();
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isBusinessSwitcherOpen, setIsBusinessSwitcherOpen] = React.useState(false);

  const loadHome = React.useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (!session?.business_id) {
      setError(null);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    if (mode === 'initial') {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      setError(null);
      await Promise.all([
        ensureDashboard(session.business_id, mode === 'refresh'),
        ensureBusinesses(mode === 'refresh'),
      ]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load the business dashboard.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [ensureBusinesses, ensureDashboard, session?.business_id]);

  React.useEffect(() => {
    void loadHome();
  }, [loadHome]);

  const quickStats = dashboard
    ? [
        {
          icon: BadgeIndianRupee,
          label: 'Net revenue',
          tone: 'bg-emerald-500/10 text-emerald-600',
          value: formatCurrency(dashboard.stats.revenue.total),
        },
        {
          icon: ReceiptText,
          label: 'Unpaid invoices',
          tone: 'bg-amber-500/10 text-amber-600',
          value: String(dashboard.stats.invoices.unpaid),
        },
        {
          icon: PackageCheck,
          label: 'Low stock items',
          tone: 'bg-sky-500/10 text-sky-600',
          value: String(dashboard.stats.inventory.low_stock_items),
        },
      ]
    : [];

  const quickActions = [
    {
      icon: ReceiptText,
      label: `${dashboard?.stats.invoices.sales ?? 0} sales invoices`,
      meta: 'Open invoicing and stay on top of billing volume.',
      onPress: () => router.push('/(app)/invoices'),
    },
    {
      icon: Users,
      label: `${dashboard?.stats.parties.customers ?? 0} active customers`,
      meta: 'Customer and supplier relationships tracked in one place.',
      onPress: () => router.push('/(app)/customers'),
    },
    {
      icon: PackageCheck,
      label: formatCompactNumber(dashboard?.stats.inventory.total_value ?? 0),
      meta: 'Approximate stock value available in your active business.',
      onPress: () => router.push('/(app)/inventory'),
    },
  ];

  const recentPayments = dashboard?.recent_payments.slice(0, 3) ?? [];
  const lowStockItems = dashboard?.low_stock_items.slice(0, 3) ?? [];
  const dashboardCacheState =
    dashboardStatus === 'loading'
      ? 'refreshing'
      : dashboard
        ? isCacheStale(dashboardUpdatedAt, CACHE_TTL_MS.dashboard)
          ? 'stale'
          : 'cached'
        : 'empty';

  async function handleSwitchBusiness(business: (typeof businesses)[number]) {
    try {
      await switchBusiness(business);
      setIsBusinessSwitcherOpen(false);
    } catch {}
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="absolute -left-16 top-10 h-40 w-40 rounded-full bg-primary/8" />
      <View className="absolute right-0 top-44 h-32 w-32 rounded-full bg-secondary/70" />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-6 pb-28 pt-4"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadHome('refresh')} />}>
        <View className="gap-6">
          {isLoading || dashboardStatus === 'loading' ? <HomeScreenSkeleton /> : null}

          {!isLoading && dashboardStatus !== 'loading' ? (
          <>
          <View className="gap-2">
            <DevCacheIndicator
              label="home"
              state={dashboardCacheState}
              detail={formatCacheAge(dashboardUpdatedAt)}
            />
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1 gap-2">
                <Text className="text-sm uppercase tracking-[2px] text-muted-foreground">VyaparX mobile</Text>
                <Text className="text-3xl font-extrabold tracking-tight text-foreground">
                  Hello, {user?.name?.split(' ')[0] ?? 'there'}
                </Text>
                <Text className="text-base leading-6 text-muted-foreground">
                  Live numbers from your active business, with quick visibility into billing, payments, and stock.
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Open notifications preview"
                accessibilityRole="button"
                className="rounded-2xl border border-border/70 bg-card px-3 py-3"
                onPress={() => {
                  void refresh();
                  router.push('/(app)/notifications');
                }}>
                <View>
                  <Icon as={Bell} className="text-foreground" size={20} />
                  {notificationStats.unread > 0 ? (
                    <View className="absolute -right-1.5 -top-1.5 min-w-[18px] rounded-full bg-destructive px-1.5 py-0.5">
                      <Text className="text-center text-[10px] font-semibold text-white">
                        {notificationStats.unread > 99 ? '99+' : String(notificationStats.unread)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            </View>
            <View className="mt-2 flex-row items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3">
              <View className="rounded-2xl bg-primary/10 px-3 py-3">
                <Icon as={Building2} className="text-primary" size={18} />
              </View>
              <View className="flex-1 gap-1">
                <Text className="text-sm text-muted-foreground">Current workspace</Text>
                <Text className="font-semibold text-foreground">{currentBusiness?.name ?? 'No business selected'}</Text>
              </View>
            </View>
            <View className="mt-3 flex-row gap-3">
              <Button
                variant="outline"
                className="h-12 flex-1 rounded-2xl"
                onPress={() => setIsBusinessSwitcherOpen(true)}>
                <Icon as={Repeat} className="text-foreground" size={16} />
                <Text>Switch business</Text>
              </Button>
              <Button
                className="h-12 flex-1 rounded-2xl"
                onPress={() =>
                  router.push({
                    pathname: '/business-setup',
                    params: { mode: 'create', return_to: '/(app)' },
                  })
                }>
                <Icon as={CirclePlus} className="text-primary-foreground" size={16} />
                <Text>Create business</Text>
              </Button>
            </View>
          </View>

          <Card className="overflow-hidden rounded-[32px] border-border bg-card">
            <View className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10" />
            <View className="absolute -bottom-12 left-0 h-28 w-28 rounded-full bg-secondary/80" />
            <CardHeader className="gap-3">
              <View className="w-12 rounded-2xl bg-primary px-0 py-3">
                <Icon as={ChartColumnBig} className="mx-auto text-primary-foreground" size={22} />
              </View>
              <CardTitle className="text-3xl leading-9">Today&apos;s business pulse</CardTitle>
              <CardDescription className="leading-6">
                Real dashboard stats from your backend, not placeholder cards.
              </CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              <View className="flex-row flex-wrap gap-3">
                <Pressable
                  className="min-w-[120px] flex-1 rounded-2xl border border-border/70 bg-background/85 px-4 py-4"
                  onPress={() => router.push('/(app)/reports')}>
                  <Text className="text-sm text-muted-foreground">Growth this month</Text>
                  <Text className="mt-2 text-2xl font-bold text-foreground">
                    {formatPercent(dashboard?.stats.revenue.growth_percentage ?? 0)}
                  </Text>
                </Pressable>
                <Pressable
                  className="min-w-[120px] flex-1 rounded-2xl border border-border/70 bg-background/85 px-4 py-4"
                  onPress={() => router.push('/(app)/payments')}>
                  <Text className="text-sm text-muted-foreground">Payments received</Text>
                  <Text className="mt-2 text-2xl font-bold text-foreground">
                    {dashboard?.stats.payments.received ?? 0}
                  </Text>
                </Pressable>
              </View>

              {quickStats.map((item) => (
                <Pressable
                  key={item.label}
                  className="flex-row items-center justify-between rounded-2xl border border-border/70 bg-background/85 px-4 py-4"
                  onPress={() => {
                    if (item.label === 'Net revenue') {
                      router.push('/(app)/reports');
                      return;
                    }

                    if (item.label === 'Unpaid invoices') {
                      router.push('/(app)/invoices');
                      return;
                    }

                    router.push('/(app)/inventory');
                  }}>
                  <View className="flex-row items-center gap-3">
                    <View className={`rounded-2xl px-3 py-3 ${item.tone}`}>
                      <Icon as={item.icon} size={18} />
                    </View>
                    <Text className="text-sm font-medium text-muted-foreground">{item.label}</Text>
                  </View>
                  <Text className="text-lg font-bold text-foreground">{item.value}</Text>
                </Pressable>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Quick business signals</CardTitle>
              <CardDescription>Useful summaries to orient the next action.</CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              {quickActions.map((item) => (
                <Pressable
                  key={item.label}
                  className="flex-row items-center gap-4 rounded-2xl border border-border/70 bg-background px-4 py-4"
                  onPress={item.onPress}>
                  <View className="rounded-2xl bg-primary/10 px-3 py-3">
                    <Icon as={item.icon} className="text-primary" size={18} />
                  </View>
                  <View className="flex-1 gap-1">
                    <Text className="font-semibold text-foreground">{item.label}</Text>
                    <Text className="text-sm leading-5 text-muted-foreground">{item.meta}</Text>
                  </View>
                  <Icon as={ArrowUpRight} className="text-muted-foreground" size={18} />
                </Pressable>
              ))}
            </CardContent>
          </Card>

          {error || businessError || dashboardError ? (
            <Card className="rounded-[28px] border-destructive/20 bg-destructive/5">
              <CardContent className="px-5 py-5">
                <Text className="font-semibold text-foreground">Dashboard sync needs attention</Text>
                <Text className="mt-2 text-sm leading-6 text-muted-foreground">{error ?? businessError ?? dashboardError}</Text>
              </CardContent>
            </Card>
          ) : null}

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Recent invoices</CardTitle>
              <CardDescription>Latest billing activity inside {currentBusiness?.name ?? 'your workspace'}.</CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              {dashboard?.recent_invoices.length ? (
                dashboard.recent_invoices.map((invoice) => (
                  <Pressable
                    key={invoice.id}
                    className="flex-row items-center gap-4 rounded-2xl border border-border/70 bg-background px-4 py-4"
                    onPress={() =>
                      router.push({
                        pathname: '/(app)/invoice-detail',
                        params: { id: invoice.id },
                      })
                    }>
                    <View className="rounded-2xl bg-primary/10 px-3 py-3">
                      <Icon as={ReceiptText} className="text-primary" size={18} />
                    </View>
                    <View className="flex-1 gap-1">
                      <Text className="font-semibold text-foreground">{invoice.invoice_number}</Text>
                      <Text className="text-sm text-muted-foreground">
                        {invoice.party_name.trim().toUpperCase()} • {formatShortDate(invoice.invoice_date)}
                      </Text>
                    </View>
                    <View className="items-end gap-1">
                      <Text className="font-semibold text-foreground">{formatCurrency(invoice.grand_total)}</Text>
                      <Text className="text-xs uppercase tracking-[1px] text-muted-foreground">
                        {invoice.payment_status}
                      </Text>
                    </View>
                  </Pressable>
                ))
              ) : (
                <Text className="text-sm leading-6 text-muted-foreground">
                  No invoice activity yet for this business.
                </Text>
              )}
            </CardContent>
          </Card>

          <View className="flex-row gap-4">
            <Card className="flex-1 rounded-[28px]">
              <CardHeader>
                <CardTitle>Recent payments</CardTitle>
              </CardHeader>
              <CardContent className="gap-3">
                {recentPayments.length ? (
                  recentPayments.map((payment) => (
                    <Pressable
                      key={payment.id}
                      className="gap-1 rounded-2xl border border-border/70 bg-background px-4 py-3"
                      onPress={() =>
                        router.push({
                          pathname: '/(app)/payment-detail',
                          params: { id: payment.id },
                        })
                      }>
                      <Text className="font-semibold text-foreground">{payment.party_name}</Text>
                      <Text className="text-sm text-muted-foreground">
                        {payment.payment_type} • {formatShortDate(payment.payment_date)}
                      </Text>
                      <Text className="text-sm font-semibold text-foreground">{formatCurrency(payment.amount)}</Text>
                    </Pressable>
                  ))
                ) : (
                  <Text className="text-sm leading-6 text-muted-foreground">No recent payments yet.</Text>
                )}
              </CardContent>
            </Card>

            <Card className="flex-1 rounded-[28px]">
              <CardHeader>
                <CardTitle>Stock alerts</CardTitle>
              </CardHeader>
              <CardContent className="gap-3">
                {lowStockItems.length ? (
                  lowStockItems.map((item) => (
                    <Pressable
                      key={item.id}
                      className="gap-1 rounded-2xl border border-border/70 bg-background px-4 py-3"
                      onPress={() =>
                        router.push({
                          pathname: '/(app)/inventory-edit',
                          params: { id: item.id },
                        })
                      }>
                      <Text className="font-semibold text-foreground">{item.name}</Text>
                      <Text className="text-sm text-muted-foreground">
                        {item.current_stock} {item.unit} left
                      </Text>
                      <Text className="text-xs uppercase tracking-[1px] text-muted-foreground">
                        Threshold {item.low_stock_threshold}
                      </Text>
                    </Pressable>
                  ))
                ) : (
                  <Text className="text-sm leading-6 text-muted-foreground">Stock health looks stable.</Text>
                )}
              </CardContent>
            </Card>
          </View>

          <Button className="h-14 rounded-[22px]" onPress={() => router.push('/(app)/invoice-create-sales')}>
            <Text className="text-base">Keep building today&apos;s sales</Text>
          </Button>
          </>
          ) : null}
        </View>
      </ScrollView>
      {isBusinessSwitcherOpen ? (
        <View className="absolute inset-0 z-50 items-center justify-center bg-black/60 px-4">
          <Pressable
            className="absolute inset-0"
            accessibilityRole="button"
            onPress={() => setIsBusinessSwitcherOpen(false)}
          />
          <View className="w-full max-w-[420px] rounded-[28px] border border-border bg-background px-6 py-6">
            <View className="mb-5 gap-2">
              <Text className="pr-10 text-xl font-bold text-foreground">Switch business</Text>
              <Text className="text-sm leading-6 text-muted-foreground">
                Select the workspace you want to open right now.
              </Text>
            </View>
            <View className="gap-3">
              {businesses.length ? (
                businesses.map((business) => {
                  const isCurrent = business.id === session?.business_id;
                  const isSwitching = isSwitchingBusinessId === business.id;

                  return (
                    <Pressable
                      key={business.id}
                      className={`flex-row items-center gap-4 rounded-2xl border px-4 py-4 ${
                        isCurrent ? 'border-primary/20 bg-primary/5' : 'border-border/70 bg-background'
                      }`}
                      disabled={isSwitching}
                      onPress={() => void handleSwitchBusiness(business)}>
                      <View className="rounded-2xl bg-primary/10 px-3 py-3">
                        <Icon as={Building2} className="text-primary" size={18} />
                      </View>
                      <View className="flex-1 gap-1">
                        <Text className="font-semibold text-foreground">{business.name}</Text>
                        <Text className="text-xs uppercase tracking-[1px] text-muted-foreground">{business.role}</Text>
                      </View>
                      {isCurrent ? (
                        <View className="rounded-full bg-primary/10 px-3 py-1">
                          <Text className="text-xs font-semibold uppercase tracking-[1px] text-primary">Current</Text>
                        </View>
                      ) : isSwitching ? (
                        <View className="px-2 py-1">
                          <Skeleton className="h-5 w-5 rounded-full" />
                        </View>
                      ) : (
                        <Icon as={ChevronRight} className="text-muted-foreground" size={18} />
                      )}
                    </Pressable>
                  );
                })
              ) : (
                <View className="gap-3">
                  <Skeleton className="h-20 w-full rounded-2xl" />
                  <Skeleton className="h-20 w-full rounded-2xl" />
                  <Skeleton className="h-20 w-full rounded-2xl" />
                </View>
              )}
              <Button
                variant="outline"
                className="h-12 rounded-2xl"
                onPress={() => setIsBusinessSwitcherOpen(false)}>
                <Text>Close</Text>
              </Button>
              <Button
                className="h-12 rounded-2xl"
                onPress={() => {
                  setIsBusinessSwitcherOpen(false);
                  router.push({
                    pathname: '/business-setup',
                    params: { mode: 'create', return_to: '/(app)' },
                  });
                }}>
                <Icon as={CirclePlus} className="text-primary-foreground" size={16} />
                <Text>Create and switch</Text>
              </Button>
            </View>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function HomeScreenSkeleton() {
  return (
    <View className="gap-6">
      <View className="gap-3">
        <Skeleton className="h-4 w-28 rounded-full" />
        <Skeleton className="h-9 w-48 rounded-full" />
        <Skeleton className="h-5 w-full rounded-full" />
        <Skeleton className="h-5 w-5/6 rounded-full" />
      </View>
      <Skeleton className="h-20 w-full rounded-2xl" />
      <View className="flex-row gap-3">
        <Skeleton className="h-12 flex-1 rounded-2xl" />
        <Skeleton className="h-12 flex-1 rounded-2xl" />
      </View>
      <Skeleton className="h-72 w-full rounded-[32px]" />
      <Skeleton className="h-52 w-full rounded-[28px]" />
      <Skeleton className="h-64 w-full rounded-[28px]" />
    </View>
  );
}
