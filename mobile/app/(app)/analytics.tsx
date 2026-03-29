import * as React from 'react';
import { Pressable, RefreshControl, ScrollView, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart3, ChevronLeft, ChevronRight, CircleDollarSign, Package, ShoppingCart, TrendingUp, Users, type LucideIcon } from 'lucide-react-native';

import { CollectionScreenSkeleton } from '@/components/screen-skeleton';
import { SubpageHeader } from '@/components/subpage-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { formatCompactNumber, formatCurrency, formatPercent, formatShortDate } from '@/lib/formatters';
import { analyticsService } from '@/services/analytics.service';
import { businessService } from '@/services/business.service';
import { useAuthStore } from '@/store/auth-store';
import type { AnalyticsData, AnalyticsTopParty } from '@/types/analytics';

const PERIODS = [
  { days: 7, label: '7D' },
  { days: 30, label: '30D' },
  { days: 90, label: '90D' },
  { days: 365, label: '1Y' },
] as const;

export default function AnalyticsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { session } = useAuthStore();
  const [businessName, setBusinessName] = React.useState<string | null>(null);
  const [analytics, setAnalytics] = React.useState<AnalyticsData | null>(null);
  const [selectedDays, setSelectedDays] = React.useState<(typeof PERIODS)[number]['days']>(30);
  const [trendWindowIndex, setTrendWindowIndex] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const trendPagerRef = React.useRef<ScrollView | null>(null);
  const trendCardWidth = Math.max(width - 48, 280);

  const loadAnalytics = React.useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!session?.business_id) {
        setBusinessName(null);
        setAnalytics(null);
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
        const [business, analyticsData] = await Promise.all([
          businessService.getBusiness(session.business_id),
          analyticsService.getAnalytics(session.business_id, selectedDays),
        ]);

        setBusinessName(business.name);
        setAnalytics(analyticsData);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load analytics right now.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedDays, session?.business_id]
  );

  React.useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const currentMonth = analytics?.monthly_comparison.current_month ?? { profit: 0, purchases: 0, sales: 0 };
  const lastMonth = analytics?.monthly_comparison.last_month ?? { profit: 0, purchases: 0, sales: 0 };
  const paymentModes = analytics?.payment_modes ?? [];
  const topItems = analytics?.top_selling_items ?? [];
  const topCustomers = analytics?.top_customers ?? [];
  const topSuppliers = analytics?.top_suppliers ?? [];
  const trendPoints = analytics?.time_series ?? [];
  const trendWindows = React.useMemo(() => chunkTrendPoints(trendPoints, 5), [trendPoints]);
  const visibleTrendPoints = React.useMemo(() => {
    if (!trendWindows.length) {
      return [];
    }

    return trendWindows[trendWindowIndex] ?? trendWindows[trendWindows.length - 1] ?? [];
  }, [trendWindowIndex, trendWindows]);

  React.useEffect(() => {
    if (!trendWindows.length) {
      setTrendWindowIndex(0);
      return;
    }

    setTrendWindowIndex(trendWindows.length - 1);
  }, [selectedDays, trendWindows.length]);

  React.useEffect(() => {
    if (!trendWindows.length) {
      return;
    }

    trendPagerRef.current?.scrollTo({
      animated: false,
      x: trendWindowIndex * trendCardWidth,
    });
  }, [trendCardWidth, trendWindowIndex, trendWindows.length]);

  const salesChange = calculateChange(currentMonth.sales, lastMonth.sales);
  const purchasesChange = calculateChange(currentMonth.purchases, lastMonth.purchases);
  const profitChange = calculateChange(currentMonth.profit, lastMonth.profit);
  const maxTrendValue = Math.max(1, ...visibleTrendPoints.flatMap((point) => [point.sales, point.purchases, point.profit]));
  const canViewOlderTrend = trendWindowIndex > 0;
  const canViewNewerTrend = trendWindowIndex < trendWindows.length - 1;
  const visibleTrendLabel = visibleTrendPoints.length
    ? formatTrendWindowLabel(visibleTrendPoints[0]?.date, visibleTrendPoints[visibleTrendPoints.length - 1]?.date)
    : null;

  if (isLoading) {
    return <CollectionScreenSkeleton metricCount={3} rowCount={4} showActionCard />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-6 pb-28 pt-4"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadAnalytics('refresh')} />}>
        <View className="gap-6">
          <SubpageHeader
            backHref="/(app)/more"
            eyebrow="Analytics"
            subtitle={`Trend, mix, and party performance for ${businessName ?? 'your active workspace'}.`}
            title="Performance view"
          />

          <Card className="overflow-hidden rounded-[30px] border-border bg-card">
            <View className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/10" />
            <CardHeader>
              <CardTitle>Period</CardTitle>
              <CardDescription>Choose the window used for sales, purchases, and payment mix.</CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              <View className="flex-row gap-3">
                {PERIODS.map((period) => (
                  <Pressable
                    key={period.days}
                    className={`rounded-[22px] border px-4 py-3 ${
                      selectedDays === period.days ? 'border-primary bg-primary' : 'border-border/70 bg-background'
                    }`}
                    onPress={() => setSelectedDays(period.days)}>
                    <Text className={selectedDays === period.days ? 'text-primary-foreground' : 'text-foreground'}>
                      {period.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text className="text-sm text-muted-foreground">
                Current comparison card still uses this month versus last month for baseline.
              </Text>
            </CardContent>
          </Card>

          <View className="flex-row flex-wrap gap-4">
            <MetricCard
              change={salesChange}
              description="This month vs last month"
              icon={ShoppingCart}
              title="Sales"
              value={formatCurrency(currentMonth.sales)}
            />
            <MetricCard
              change={purchasesChange}
              description="Purchase outflow this month"
              icon={Package}
              title="Purchases"
              value={formatCurrency(currentMonth.purchases)}
            />
            <MetricCard
              change={profitChange}
              description="Net spread this month"
              icon={CircleDollarSign}
              title="Profit"
              value={formatCurrency(currentMonth.profit)}
            />
          </View>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Trend snapshot</CardTitle>
              <CardDescription>Review the timeline in 5-day windows for a cleaner comparison.</CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              {visibleTrendPoints.length ? (
                <>
                  <View className="flex-row items-center justify-between gap-3 rounded-[22px] border border-border/70 bg-background px-4 py-3">
                    <Button
                      variant="outline"
                      className="h-10 rounded-full px-3"
                      disabled={!canViewOlderTrend}
                      onPress={() => {
                        const nextIndex = Math.max(0, trendWindowIndex - 1);
                        setTrendWindowIndex(nextIndex);
                        trendPagerRef.current?.scrollTo({ animated: true, x: nextIndex * trendCardWidth });
                      }}>
                      <Icon as={ChevronLeft} className="text-foreground" size={16} />
                      <Text>Older</Text>
                    </Button>
                    <View className="items-center gap-2">
                      <Text className="text-xs uppercase tracking-[1px] text-muted-foreground">
                        Window {trendWindowIndex + 1} of {trendWindows.length}
                      </Text>
                      {visibleTrendLabel ? (
                        <Text className="text-sm font-semibold text-foreground">{visibleTrendLabel}</Text>
                      ) : null}
                      <View className="flex-row gap-2">
                        {trendWindows.map((_, index) => (
                          <Pressable
                            key={index}
                            accessibilityRole="button"
                            className={`h-2.5 rounded-full ${index === trendWindowIndex ? 'w-6 bg-primary' : 'w-2.5 bg-border'}`}
                            onPress={() => setTrendWindowIndex(index)}
                          />
                        ))}
                      </View>
                    </View>
                    <Button
                      variant="outline"
                      className="h-10 rounded-full px-3"
                      disabled={!canViewNewerTrend}
                      onPress={() => {
                        const nextIndex = Math.min(trendWindows.length - 1, trendWindowIndex + 1);
                        setTrendWindowIndex(nextIndex);
                        trendPagerRef.current?.scrollTo({ animated: true, x: nextIndex * trendCardWidth });
                      }}>
                      <Text>Newer</Text>
                      <Icon as={ChevronRight} className="text-foreground" size={16} />
                    </Button>
                  </View>
                  <View className="flex-row flex-wrap gap-3">
                    <LegendDot colorClass="bg-indigo-500" label="Sales" />
                    <LegendDot colorClass="bg-amber-500" label="Purchases" />
                    <LegendDot colorClass="bg-emerald-500" label="Profit" />
                  </View>
                  <ScrollView
                    ref={trendPagerRef}
                    horizontal
                    pagingEnabled
                    decelerationRate="fast"
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={trendCardWidth}
                    snapToAlignment="start"
                    onMomentumScrollEnd={(event) => {
                      const nextIndex = Math.round(event.nativeEvent.contentOffset.x / trendCardWidth);
                      setTrendWindowIndex(Math.max(0, Math.min(trendWindows.length - 1, nextIndex)));
                    }}>
                    <View className="flex-row">
                      {trendWindows.map((windowPoints, windowIndex) => {
                        const windowMax = Math.max(
                          1,
                          ...windowPoints.flatMap((point) => [point.sales, point.purchases, point.profit]),
                        );

                        return (
                          <View
                            key={windowIndex}
                            className="gap-3 pr-3"
                            style={{ width: trendCardWidth }}>
                            {windowPoints.map((point) => (
                              <View key={point.date} className="rounded-[24px] border border-border/70 bg-background px-4 py-4">
                                <View className="mb-3 flex-row items-center justify-between gap-3">
                                  <Text className="font-semibold text-foreground">{formatShortDate(point.date)}</Text>
                                  <Text className="text-xs uppercase tracking-[1px] text-muted-foreground">Daily totals</Text>
                                </View>
                                <View className="gap-3">
                                  <TrendBarRow colorClass="bg-indigo-500" label="Sales" max={windowMax} value={point.sales} />
                                  <TrendBarRow colorClass="bg-amber-500" label="Purchases" max={windowMax} value={point.purchases} />
                                  <TrendBarRow colorClass="bg-emerald-500" label="Profit" max={windowMax} value={Math.max(point.profit, 0)} />
                                </View>
                              </View>
                            ))}
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                </>
              ) : (
                <EmptyState icon={TrendingUp} title="No trend data yet" subtitle="Analytics will fill in as invoices and payments accumulate." />
              )}
            </CardContent>
          </Card>

          <View className="gap-4">
            <Card className="rounded-[28px]">
              <CardHeader>
                <CardTitle>Payment mix</CardTitle>
                <CardDescription>Channel contribution across recorded payments.</CardDescription>
              </CardHeader>
              <CardContent className="gap-3">
                {paymentModes.length ? (
                  paymentModes.map((mode, index) => (
                    <View key={mode.category} className="gap-3 rounded-[24px] border border-border/70 bg-background px-4 py-4">
                      <View className="flex-row items-center justify-between gap-3">
                        <View className="flex-row items-center gap-3">
                          <View className="rounded-full bg-primary/10 px-3 py-1.5">
                            <Text className="text-xs font-semibold uppercase tracking-[1px] text-primary">#{index + 1}</Text>
                          </View>
                          <Text className="font-semibold capitalize text-foreground">{mode.category.replaceAll('_', ' ')}</Text>
                        </View>
                        <Text className="font-semibold text-foreground">{mode.percentage.toFixed(1)}%</Text>
                      </View>
                      <View className="h-3 rounded-full bg-muted">
                        <View className="h-3 rounded-full bg-primary" style={{ width: `${Math.max(mode.percentage, 6)}%` }} />
                      </View>
                      <View className="flex-row items-center justify-between gap-3">
                        <Text className="text-sm text-muted-foreground">Collected through this mode</Text>
                        <Text className="font-semibold text-foreground">{formatCurrency(mode.value)}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <EmptyState icon={BarChart3} title="No payment mix yet" subtitle="Payment methods appear once receipts are recorded." />
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[28px]">
              <CardHeader>
                <CardTitle>Top items</CardTitle>
                <CardDescription>Best sellers ranked by revenue and quantity.</CardDescription>
              </CardHeader>
              <CardContent className="gap-3">
                {topItems.length ? (
                  topItems.map((item, index) => (
                    <Pressable
                      key={item.id}
                      className="gap-3 rounded-[24px] border border-border/70 bg-background px-4 py-4"
                      onPress={() => router.push({ pathname: '/(app)/inventory-edit', params: { id: item.id } })}>
                      <View className="flex-row items-start justify-between gap-3">
                        <View className="flex-1 gap-1">
                          <View className="flex-row items-center gap-3">
                            <View className="rounded-full bg-primary/10 px-3 py-1.5">
                              <Text className="text-xs font-semibold uppercase tracking-[1px] text-primary">#{index + 1}</Text>
                            </View>
                            <Text className="font-semibold text-foreground">{item.name}</Text>
                          </View>
                          <Text className="text-sm text-muted-foreground">
                            {formatCompactNumber(item.quantity)} units sold
                          </Text>
                        </View>
                        <Text className="font-semibold text-foreground">{formatCurrency(item.revenue)}</Text>
                      </View>
                      <View className="h-2 rounded-full bg-muted">
                        <View
                          className="h-2 rounded-full bg-primary"
                          style={{ width: `${Math.max((item.revenue / Math.max(1, topItems[0]?.revenue ?? 1)) * 100, 10)}%` }}
                        />
                      </View>
                    </Pressable>
                  ))
                ) : (
                  <EmptyState icon={Package} title="No top items yet" subtitle="Product ranking appears after sales accumulate." />
                )}
              </CardContent>
            </Card>
          </View>

          <PartyListCard
            description="Customers contributing the highest invoice value."
            emptySubtitle="Top customers will appear here once sales history builds."
            emptyTitle="No customer ranking yet"
            icon={Users}
            items={topCustomers}
            title="Top customers"
            tone="emerald"
          />

          <PartyListCard
            description="Suppliers driving the highest purchase value."
            emptySubtitle="Top suppliers will appear here once purchase history builds."
            emptyTitle="No supplier ranking yet"
            icon={Package}
            items={topSuppliers}
            title="Top suppliers"
            tone="rose"
          />

          {error ? (
            <Card className="rounded-[28px] border-destructive/20 bg-destructive/5">
              <CardContent className="px-5 py-5">
                <Text className="font-semibold text-foreground">Analytics sync needs attention</Text>
                <Text className="mt-2 text-sm leading-6 text-muted-foreground">{error}</Text>
              </CardContent>
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({
  change,
  description,
  icon,
  title,
  value,
}: {
  change: number;
  description: string;
  icon: LucideIcon;
  title: string;
  value: string;
}) {
  return (
    <Card className="min-w-[145px] flex-1 rounded-[28px]">
      <CardHeader>
        <View className="flex-row items-center justify-between gap-3">
          <CardTitle>{title}</CardTitle>
          <View className="rounded-2xl bg-primary/10 px-3 py-3">
            <Icon as={icon} className="text-primary" size={18} />
          </View>
        </View>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="gap-2">
        <Text className="text-2xl font-extrabold text-foreground">{value}</Text>
        <Text className={`text-sm font-semibold ${change >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
          {formatPercent(change)}
        </Text>
      </CardContent>
    </Card>
  );
}

function LegendDot({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <View className={`h-2.5 w-2.5 rounded-full ${colorClass}`} />
      <Text className="text-sm text-muted-foreground">{label}</Text>
    </View>
  );
}

function Bar({ className, max, value }: { className: string; max: number; value: number }) {
  const height = Math.max(8, Math.round((value / max) * 100));
  return <View className={`w-3 rounded-full ${className}`} style={{ height: `${height}%` }} />;
}

function TrendBarRow({
  colorClass,
  label,
  max,
  value,
}: {
  colorClass: string;
  label: string;
  max: number;
  value: number;
}) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-row items-center gap-2">
          <View className={`h-2.5 w-2.5 rounded-full ${colorClass}`} />
          <Text className="text-sm font-medium text-foreground">{label}</Text>
        </View>
        <Text className="text-sm font-semibold text-foreground">{formatCompactNumber(value)}</Text>
      </View>
      <View className="h-3 rounded-full bg-muted">
        <View className={`h-3 rounded-full ${colorClass}`} style={{ width: `${Math.max((value / max) * 100, value > 0 ? 8 : 0)}%` }} />
      </View>
    </View>
  );
}

function PartyListCard({
  description,
  emptySubtitle,
  emptyTitle,
  icon,
  items,
  title,
  tone,
}: {
  description: string;
  emptySubtitle: string;
  emptyTitle: string;
  icon: LucideIcon;
  items: AnalyticsTopParty[];
  title: string;
  tone: 'emerald' | 'rose';
}) {
  const router = useRouter();

  return (
    <Card className="rounded-[28px]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="gap-3">
        {items.length ? (
          items.map((item, index) => (
            <Pressable
              key={item.id}
              className="rounded-2xl border border-border/70 bg-background px-4 py-4"
              onPress={() => router.push({ pathname: '/(app)/party-detail', params: { id: item.id } })}>
              <View className="flex-row items-center gap-4">
                <View className={`rounded-2xl px-3 py-3 ${tone === 'emerald' ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                  <Text className={`font-semibold ${tone === 'emerald' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {index + 1}
                  </Text>
                </View>
                <View className="flex-1 gap-1">
                  <Text className="font-semibold text-foreground">{item.name}</Text>
                  <Text className="text-sm text-muted-foreground">{item.invoice_count} invoices</Text>
                </View>
                <Text className="font-semibold text-foreground">{formatCurrency(item.total_amount)}</Text>
              </View>
            </Pressable>
          ))
        ) : (
          <EmptyState icon={icon} title={emptyTitle} subtitle={emptySubtitle} />
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon,
  subtitle,
  title,
}: {
  icon: LucideIcon;
  subtitle: string;
  title: string;
}) {
  return (
    <View className="items-center gap-3 rounded-[24px] border border-dashed border-border/70 bg-muted/20 px-5 py-8">
      <View className="rounded-[22px] bg-primary/10 px-4 py-4">
        <Icon as={icon} className="text-primary" size={22} />
      </View>
      <View className="items-center gap-1">
        <Text className="font-semibold text-foreground">{title}</Text>
        <Text className="text-center text-sm leading-6 text-muted-foreground">{subtitle}</Text>
      </View>
    </View>
  );
}

function calculateChange(current: number, previous: number) {
  if (!previous) {
    return current > 0 ? 100 : 0;
  }

  return ((current - previous) / previous) * 100;
}

function formatTrendWindowLabel(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) {
    return '';
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const shortMonth = (date: Date) => date.toLocaleString('en-IN', { month: 'short' });

  if (sameMonth) {
    return `${shortMonth(start)} ${start.getDate()} - ${end.getDate()}`;
  }

  return `${shortMonth(start)} ${start.getDate()} - ${shortMonth(end)} ${end.getDate()}`;
}

function chunkTrendPoints<T>(items: T[], chunkSize: number) {
  if (!items.length || chunkSize <= 0) {
    return [];
  }

  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}
