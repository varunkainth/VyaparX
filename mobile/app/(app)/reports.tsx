import * as React from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart3, Boxes, ChevronRight, FileSpreadsheet, ReceiptText, ShoppingCart, TrendingDown, TrendingUp, Wallet } from 'lucide-react-native';

import { CollectionScreenSkeleton } from '@/components/screen-skeleton';
import { SubpageHeader } from '@/components/subpage-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { formatCurrency, formatMonthLabel } from '@/lib/formatters';
import { businessService } from '@/services/business.service';
import { reportService } from '@/services/report.service';
import { useAuthStore } from '@/store/auth-store';
import type { GstSummaryReport, LowStockReportItem, MonthlySalesReportItem, OutstandingReport } from '@/types/report';

function getDefaultDateRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    from_date: from.toISOString().slice(0, 10),
    to_date: to.toISOString().slice(0, 10),
  };
}

export default function ReportsScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const [businessName, setBusinessName] = React.useState<string | null>(null);
  const [monthlySales, setMonthlySales] = React.useState<MonthlySalesReportItem[]>([]);
  const [outstanding, setOutstanding] = React.useState<OutstandingReport | null>(null);
  const [gstSummary, setGstSummary] = React.useState<GstSummaryReport | null>(null);
  const [lowStock, setLowStock] = React.useState<LowStockReportItem[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const loadReports = React.useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (!session?.business_id) {
      setBusinessName(null);
      setMonthlySales([]);
      setOutstanding(null);
      setGstSummary(null);
      setLowStock([]);
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
      const range = getDefaultDateRange();
      const [business, monthlySalesData, outstandingData, gstSummaryData, lowStockData] = await Promise.all([
        businessService.getBusiness(session.business_id),
        reportService.getMonthlySalesReport(session.business_id, range),
        reportService.getOutstandingReport(session.business_id),
        reportService.getGstSummaryReport(session.business_id, { ...range, invoice_type: 'sales' }),
        reportService.getLowStockReport(session.business_id),
      ]);

      setBusinessName(business.name);
      setMonthlySales(monthlySalesData);
      setOutstanding(outstandingData);
      setGstSummary(gstSummaryData);
      setLowStock(lowStockData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load report summaries.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [session?.business_id]);

  React.useEffect(() => {
    void loadReports();
  }, [loadReports]);

  if (isLoading) {
    return <CollectionScreenSkeleton metricCount={2} rowCount={6} showActionCard />;
  }

  const latestMonth = monthlySales[0] ?? null;
  const monthlySalesTotal = monthlySales.reduce((sum, item) => sum + Number(item.grand_total || 0), 0);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-6 pb-28 pt-4"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadReports('refresh')} />}>
        <View className="gap-6">
          <SubpageHeader
            backHref="/(app)/more"
            eyebrow="Reports"
            subtitle={`Live business visibility for ${businessName ?? 'your active workspace'}.`}
            title="Business insights"
          />

          <View className="flex-row flex-wrap gap-4">
            <Pressable className="min-w-[145px] flex-1" onPress={() => router.push('/(app)/invoices')}>
              <Card className="rounded-[28px]">
                <CardHeader>
                  <CardTitle>Sales period total</CardTitle>
                  <CardDescription>Last 6 months billed value</CardDescription>
                </CardHeader>
                <CardContent>
                  <Text className="text-2xl font-extrabold text-foreground">{formatCurrency(monthlySalesTotal)}</Text>
                </CardContent>
              </Card>
            </Pressable>

            <Pressable className="min-w-[145px] flex-1" onPress={() => router.push('/(app)/customers')}>
              <Card className="rounded-[28px]">
                <CardHeader>
                  <CardTitle>Receivable</CardTitle>
                  <CardDescription>Open customer balances</CardDescription>
                </CardHeader>
                <CardContent>
                  <Text className="text-2xl font-extrabold text-foreground">
                    {formatCurrency(Number(outstanding?.summary.total_receivable ?? 0))}
                  </Text>
                </CardContent>
              </Card>
            </Pressable>
          </View>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Report library</CardTitle>
              <CardDescription>Open dedicated report views with export actions.</CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              <ReportLink
                description={latestMonth ? `Latest sales bucket: ${formatMonthLabel(latestMonth.month)}` : 'Monthly sales totals with CSV or Excel export.'}
                icon={TrendingUp}
                title="Sales report"
                value={formatCurrency(monthlySalesTotal)}
                onPress={() => router.push('/(app)/report-sales')}
              />
              <ReportLink
                description="Purchase totals derived from GST summary export."
                icon={ShoppingCart}
                title="Purchase report"
                value="Open"
                onPress={() => router.push('/(app)/report-purchase')}
              />
              <ReportLink
                description="Derived from sales and purchase summaries."
                icon={Wallet}
                title="Profit and loss"
                value="Open"
                onPress={() => router.push('/(app)/report-profit-loss')}
              />
              <ReportLink
                description="Sales tax snapshot with invoice-type filtering."
                icon={ReceiptText}
                title="GST report"
                value={formatCurrency(Number(gstSummary?.total_tax ?? 0))}
                onPress={() => router.push('/(app)/report-gst')}
              />
              <ReportLink
                description="Receivable and payable balances by party."
                icon={TrendingDown}
                title="Outstanding report"
                value={formatCurrency(Number(outstanding?.summary.total_receivable ?? 0))}
                onPress={() => router.push('/(app)/report-outstanding')}
              />
              <ReportLink
                description="Inventory items below threshold with export support."
                icon={Boxes}
                title="Low stock report"
                value={`${lowStock.length} items`}
                onPress={() => router.push('/(app)/report-low-stock')}
              />
            </CardContent>
          </Card>

          <View className="flex-row gap-4">
            <Card className="flex-1 rounded-[28px]">
              <CardHeader>
                <CardTitle>Outstanding</CardTitle>
                <CardDescription>Receivable vs payable</CardDescription>
              </CardHeader>
              <CardContent className="gap-3">
                <View className="rounded-2xl border border-border/70 bg-background px-4 py-3">
                  <Text className="text-xs uppercase tracking-[1px] text-muted-foreground">Receivable</Text>
                  <Text className="mt-1 text-xl font-bold text-foreground">
                    {formatCurrency(Number(outstanding?.summary.total_receivable ?? 0))}
                  </Text>
                </View>
                <View className="rounded-2xl border border-border/70 bg-background px-4 py-3">
                  <Text className="text-xs uppercase tracking-[1px] text-muted-foreground">Payable</Text>
                  <Text className="mt-1 text-xl font-bold text-foreground">
                    {formatCurrency(Number(outstanding?.summary.total_payable ?? 0))}
                  </Text>
                </View>
                {outstanding?.parties.slice(0, 3).map((party) => (
                  <Pressable
                    key={party.id}
                    className="gap-1 rounded-2xl border border-border/70 bg-background px-4 py-3"
                    onPress={() => router.push({ pathname: '/(app)/party-detail', params: { id: party.id } })}>
                    <Text className="font-semibold text-foreground">{party.name}</Text>
                    <Text className="text-sm text-muted-foreground">{party.party_type}</Text>
                    <Text className="text-sm font-semibold text-foreground">{formatCurrency(Number(party.current_balance))}</Text>
                  </Pressable>
                ))}
              </CardContent>
            </Card>

            <Card className="flex-1 rounded-[28px]">
              <CardHeader>
                <CardTitle>GST summary</CardTitle>
                <CardDescription>Sales tax snapshot</CardDescription>
              </CardHeader>
              <CardContent className="gap-3">
                <View className="rounded-2xl border border-border/70 bg-background px-4 py-3">
                  <Text className="text-xs uppercase tracking-[1px] text-muted-foreground">Total tax</Text>
                  <Text className="mt-1 text-xl font-bold text-foreground">
                    {formatCurrency(Number(gstSummary?.total_tax ?? 0))}
                  </Text>
                </View>
                <View className="rounded-2xl border border-border/70 bg-background px-4 py-3">
                  <Text className="text-xs uppercase tracking-[1px] text-muted-foreground">CGST + SGST</Text>
                  <Text className="mt-1 text-base font-semibold text-foreground">
                    {formatCurrency(Number(gstSummary?.cgst_amount ?? 0) + Number(gstSummary?.sgst_amount ?? 0))}
                  </Text>
                </View>
                <View className="rounded-2xl border border-border/70 bg-background px-4 py-3">
                  <Text className="text-xs uppercase tracking-[1px] text-muted-foreground">IGST</Text>
                  <Text className="mt-1 text-base font-semibold text-foreground">
                    {formatCurrency(Number(gstSummary?.igst_amount ?? 0))}
                  </Text>
                </View>
              </CardContent>
            </Card>
          </View>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Low stock watchlist</CardTitle>
              <CardDescription>Items that need attention before the next billing cycle.</CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              {lowStock.length ? (
                lowStock.slice(0, 5).map((item) => (
                  <Pressable
                    key={item.id}
                    className="flex-row items-center gap-4 rounded-2xl border border-border/70 bg-background px-4 py-4"
                    onPress={() => router.push({ pathname: '/(app)/inventory-edit', params: { id: item.id } })}>
                    <View className="rounded-2xl bg-primary/10 px-3 py-3">
                      <Icon as={Boxes} className="text-primary" size={18} />
                    </View>
                    <View className="flex-1 gap-1">
                      <Text className="font-semibold text-foreground">{item.name}</Text>
                      <Text className="text-sm leading-5 text-muted-foreground">
                        {item.current_stock} {item.unit} left • threshold {item.low_stock_threshold}
                      </Text>
                    </View>
                    <Text className="font-semibold text-foreground">{formatCurrency(Number(item.selling_price))}</Text>
                  </Pressable>
                ))
              ) : (
                <View className="flex-row items-center gap-4 rounded-2xl border border-border/70 bg-background px-4 py-4">
                  <View className="rounded-2xl bg-primary/10 px-3 py-3">
                    <Icon as={FileSpreadsheet} className="text-primary" size={18} />
                  </View>
                  <View className="flex-1 gap-1">
                    <Text className="font-semibold text-foreground">No low stock risks right now</Text>
                    <Text className="text-sm leading-5 text-muted-foreground">
                      Inventory is currently above threshold for active items.
                    </Text>
                  </View>
                </View>
              )}
            </CardContent>
          </Card>

          {error ? (
            <Card className="rounded-[28px] border-destructive/20 bg-destructive/5">
              <CardContent className="px-5 py-5">
                <View className="flex-row items-center gap-3">
                  <Icon as={BarChart3} className="text-destructive" size={18} />
                  <Text className="font-semibold text-foreground">Report sync needs attention</Text>
                </View>
                <Text className="mt-3 text-sm leading-6 text-muted-foreground">{error}</Text>
              </CardContent>
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ReportLink({
  description,
  icon,
  onPress,
  title,
  value,
}: {
  description: string;
  icon: typeof TrendingUp;
  onPress: () => void;
  title: string;
  value: string;
}) {
  return (
    <Pressable className="flex-row items-center gap-4 rounded-2xl border border-border/70 bg-background px-4 py-4" onPress={onPress}>
      <View className="rounded-2xl bg-primary/10 px-3 py-3">
        <Icon as={icon} className="text-primary" size={18} />
      </View>
      <View className="flex-1 gap-1">
        <Text className="font-semibold text-foreground">{title}</Text>
        <Text className="text-sm leading-5 text-muted-foreground">{description}</Text>
      </View>
      <View className="items-end gap-1">
        <Text className="font-semibold text-foreground">{value}</Text>
        <Icon as={ChevronRight} className="text-muted-foreground" size={16} />
      </View>
    </Pressable>
  );
}
