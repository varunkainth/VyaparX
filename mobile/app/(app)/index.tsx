import * as React from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowUpRight,
  BadgeIndianRupee,
  Building2,
  ChartColumnBig,
  CirclePlus,
  Repeat,
  PackageCheck,
  ReceiptText,
  Users,
} from 'lucide-react-native';

import { FullScreenLoader } from '@/components/full-screen-loader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { formatCompactNumber, formatCurrency, formatPercent, formatShortDate } from '@/lib/formatters';
import { businessService } from '@/services/business.service';
import { dashboardService } from '@/services/dashboard.service';
import { useAuthStore } from '@/store/auth-store';
import type { DashboardData } from '@/types/dashboard';

export default function HomeScreen() {
  const router = useRouter();
  const { session, user } = useAuthStore();
  const [dashboard, setDashboard] = React.useState<DashboardData | null>(null);
  const [currentBusinessName, setCurrentBusinessName] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const loadHome = React.useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (!session?.business_id) {
      setCurrentBusinessName(null);
      setDashboard(null);
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
      const [business, dashboardData] = await Promise.all([
        businessService.getBusiness(session.business_id),
        dashboardService.getDashboard(session.business_id),
      ]);

      setCurrentBusinessName(business.name);
      setDashboard(dashboardData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load the business dashboard.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [session?.business_id]);

  React.useEffect(() => {
    void loadHome();
  }, [loadHome]);

  if (isLoading) {
    return <FullScreenLoader label="Loading business dashboard" />;
  }

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

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="absolute -left-16 top-10 h-40 w-40 rounded-full bg-primary/8" />
      <View className="absolute right-0 top-44 h-32 w-32 rounded-full bg-secondary/70" />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-6 pb-28 pt-4"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadHome('refresh')} />}>
        <View className="gap-6">
          <View className="gap-2">
            <Text className="text-sm uppercase tracking-[2px] text-muted-foreground">VyaparX mobile</Text>
            <Text className="text-3xl font-extrabold tracking-tight text-foreground">
              Hello, {user?.name?.split(' ')[0] ?? 'there'}
            </Text>
            <Text className="text-base leading-6 text-muted-foreground">
              Live numbers from your active business, with quick visibility into billing, payments, and stock.
            </Text>
            <View className="mt-2 flex-row items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3">
              <View className="rounded-2xl bg-primary/10 px-3 py-3">
                <Icon as={Building2} className="text-primary" size={18} />
              </View>
              <View className="flex-1 gap-1">
                <Text className="text-sm text-muted-foreground">Current workspace</Text>
                <Text className="font-semibold text-foreground">{currentBusinessName ?? 'No business selected'}</Text>
              </View>
            </View>
            <View className="mt-3 flex-row gap-3">
              <Button
                variant="outline"
                className="h-12 flex-1 rounded-2xl"
                onPress={() => router.push('/(app)/business')}>
                <Icon as={Repeat} className="text-foreground" size={16} />
                <Text>Switch business</Text>
              </Button>
              <Button
                className="h-12 flex-1 rounded-2xl"
                onPress={() =>
                  router.push({
                    pathname: '/(app)/business',
                    params: { open_create: String(Date.now()) },
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

          {error ? (
            <Card className="rounded-[28px] border-destructive/20 bg-destructive/5">
              <CardContent className="px-5 py-5">
                <Text className="font-semibold text-foreground">Dashboard sync needs attention</Text>
                <Text className="mt-2 text-sm leading-6 text-muted-foreground">{error}</Text>
              </CardContent>
            </Card>
          ) : null}

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Recent invoices</CardTitle>
              <CardDescription>Latest billing activity inside {currentBusinessName ?? 'your workspace'}.</CardDescription>
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
                        {invoice.party_name} • {formatShortDate(invoice.invoice_date)}
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
