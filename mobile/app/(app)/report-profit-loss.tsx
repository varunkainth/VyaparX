import * as React from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarRange, FileText, TrendingDown, TrendingUp, Wallet } from 'lucide-react-native';

import { CollectionScreenSkeleton } from '@/components/screen-skeleton';
import { SubpageHeader } from '@/components/subpage-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { ToastBanner, useTimedToast } from '@/components/ui/toast-banner';
import { exportBinaryReportFile, getDefaultReportRange } from '@/lib/report-export';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { reportService } from '@/services/report.service';
import { useAuthStore } from '@/store/auth-store';
import type { ProfitLossReport } from '@/types/report';

export default function ReportProfitLossScreen() {
  const { session } = useAuthStore();
  const { message, showToast } = useTimedToast();
  const [report, setReport] = React.useState<ProfitLossReport | null>(null);
  const [filters, setFilters] = React.useState(getDefaultReportRange);
  const [draftFilters, setDraftFilters] = React.useState(getDefaultReportRange);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isApplyingFilters, setIsApplyingFilters] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);

  const loadReport = React.useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (!session?.business_id) {
      setReport(null);
      setError('Select a business to view reports.');
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    if (mode === 'initial') setIsLoading(true);
    else setIsRefreshing(true);

    try {
      setError(null);
      const data = await reportService.getProfitLossReport(session.business_id, filters);
      setReport(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load profit and loss.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsApplyingFilters(false);
    }
  }, [filters, session?.business_id]);

  React.useEffect(() => {
    void loadReport();
  }, [loadReport]);

  async function onExport() {
    if (!session?.business_id) {
      setError('Select a business to export reports.');
      return;
    }

    const salesTotal = Number(report?.sales_total ?? 0);
    const purchaseTotal = Number(report?.purchase_total ?? 0);
    const grossProfit = Number(report?.gross_profit ?? 0);
    const profitMargin = Number(report?.profit_margin ?? 0);

    setIsExporting(true);
    setError(null);
    try {
      const bytes = await reportService.exportProfitLossReport(session.business_id, 'csv', filters);
      await exportBinaryReportFile({ baseName: 'profit-loss-report', bytes, format: 'csv' });
      showToast('Profit and loss report exported as CSV.');
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Unable to export profit and loss.');
    } finally {
      setIsExporting(false);
    }
  }

  const salesTotal = Number(report?.sales_total ?? 0);
  const purchaseTotal = Number(report?.purchase_total ?? 0);
  const grossProfit = Number(report?.gross_profit ?? 0);
  const profitMargin = Number(report?.profit_margin ?? 0);

  if (isLoading) {
    return <CollectionScreenSkeleton metricCount={4} rowCount={2} showActionCard />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-6 pb-28 pt-4"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadReport('refresh')} />}>
        <View className="gap-6">
          <SubpageHeader
            backHref="/(app)/reports"
            eyebrow="Reports"
            subtitle="Derived statement based on sales and purchase GST summaries."
            title="Profit and loss"
          />

          <FiltersCard
            draftFilters={draftFilters}
            isApplying={isApplyingFilters}
            onApply={() => setFilters(draftFilters)}
            onChange={setDraftFilters}
            onStartApply={() => setIsApplyingFilters(true)}
          />

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Export</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="h-12 rounded-2xl" disabled={isExporting} onPress={() => void onExport()}>
                {isExporting ? <ActivityIndicator color="#0f172a" /> : <Icon as={FileText} className="text-foreground" size={16} />}
                <Text>Export CSV</Text>
              </Button>
            </CardContent>
          </Card>

          <View className="flex-row flex-wrap gap-4">
            <MetricCard icon={TrendingUp} label="Sales" value={formatCurrency(salesTotal)} />
            <MetricCard icon={TrendingDown} label="Purchases" value={formatCurrency(purchaseTotal)} />
            <MetricCard icon={Wallet} label="Gross profit" value={formatCurrency(grossProfit)} />
            <MetricCard icon={Wallet} label="Margin" value={formatPercent(profitMargin)} />
          </View>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Statement</CardTitle>
            </CardHeader>
            <CardContent className="gap-3">
              <StatementRow label="Revenue" value={formatCurrency(salesTotal)} />
              <StatementRow label="Cost of goods sold" value={formatCurrency(purchaseTotal)} />
              <StatementRow label="Gross profit" value={formatCurrency(grossProfit)} highlight />
            </CardContent>
          </Card>

          {error ? <ErrorCard error={error} /> : null}
        </View>
      </ScrollView>
      <ToastBanner message={message} variant="success" />
    </SafeAreaView>
  );
}

function FiltersCard({
  draftFilters,
  isApplying,
  onApply,
  onChange,
  onStartApply,
}: {
  draftFilters: { from_date: string; to_date: string };
  isApplying: boolean;
  onApply: () => void;
  onChange: React.Dispatch<React.SetStateAction<{ from_date: string; to_date: string }>>;
  onStartApply: () => void;
}) {
  return (
    <Card className="rounded-[28px]">
      <CardHeader>
        <CardTitle>Filters</CardTitle>
      </CardHeader>
      <CardContent className="gap-3">
        <FilterInput label="From date" value={draftFilters.from_date} onChangeText={(value) => onChange((current) => ({ ...current, from_date: value }))} />
        <FilterInput label="To date" value={draftFilters.to_date} onChangeText={(value) => onChange((current) => ({ ...current, to_date: value }))} />
        <Button className="h-12 rounded-2xl" disabled={isApplying} onPress={() => {
          onStartApply();
          onApply();
        }}>
          {isApplying ? <ActivityIndicator color="#ffffff" /> : null}
          <Text>{isApplying ? 'Applying...' : 'Apply filters'}</Text>
        </Button>
      </CardContent>
    </Card>
  );
}

function FilterInput({ label, onChangeText, value }: { label: string; onChangeText: (value: string) => void; value: string }) {
  return (
    <View className="gap-2">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <View className="flex-row items-center gap-3 rounded-[22px] border border-border/70 bg-muted/35 px-4">
        <Icon as={CalendarRange} className="text-muted-foreground" size={18} />
        <Input className="h-14 flex-1 border-0 bg-transparent px-0" value={value} onChangeText={onChangeText} />
      </View>
    </View>
  );
}

function MetricCard({ icon, label, value }: { icon: typeof Wallet; label: string; value: string }) {
  return (
    <Card className="min-w-[145px] flex-1 rounded-[28px]">
      <CardHeader>
        <View className="flex-row items-center justify-between gap-3">
          <CardTitle>{label}</CardTitle>
          <View className="rounded-2xl bg-primary/10 px-3 py-3">
            <Icon as={icon} className="text-primary" size={18} />
          </View>
        </View>
      </CardHeader>
      <CardContent>
        <Text className="text-2xl font-extrabold text-foreground">{value}</Text>
      </CardContent>
    </Card>
  );
}

function StatementRow({ highlight, label, value }: { highlight?: boolean; label: string; value: string }) {
  return (
    <View className={`rounded-2xl border px-4 py-4 ${highlight ? 'border-primary/20 bg-primary/5' : 'border-border/70 bg-background'}`}>
      <View className="flex-row items-center justify-between gap-3">
        <Text className="font-semibold text-foreground">{label}</Text>
        <Text className="font-semibold text-foreground">{value}</Text>
      </View>
    </View>
  );
}

function ErrorCard({ error }: { error: string }) {
  return (
    <Card className="rounded-[28px] border-destructive/20 bg-destructive/5">
      <CardContent className="px-5 py-5">
        <Text className="font-semibold text-foreground">Report sync needs attention</Text>
        <Text className="mt-2 text-sm leading-6 text-muted-foreground">{error}</Text>
      </CardContent>
    </Card>
  );
}
