import * as React from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarRange, FileSpreadsheet, FileText, ShoppingCart } from 'lucide-react-native';

import { CollectionScreenSkeleton } from '@/components/screen-skeleton';
import { SubpageHeader } from '@/components/subpage-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { ToastBanner, useTimedToast } from '@/components/ui/toast-banner';
import { exportBinaryReportFile, formatSavedFileMessage, getDefaultReportRange } from '@/lib/report-export';
import { formatCurrency } from '@/lib/formatters';
import { reportService, type ReportExportFormat } from '@/services/report.service';
import { useAuthStore } from '@/store/auth-store';
import type { PurchaseReport } from '@/types/report';

export default function ReportPurchaseScreen() {
  const { session } = useAuthStore();
  const { message, showToast } = useTimedToast();
  const [report, setReport] = React.useState<PurchaseReport | null>(null);
  const [filters, setFilters] = React.useState(getDefaultReportRange);
  const [draftFilters, setDraftFilters] = React.useState(getDefaultReportRange);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isApplyingFilters, setIsApplyingFilters] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState<ReportExportFormat | null>(null);

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
      const data = await reportService.getPurchaseReport(session.business_id, filters);
      setReport(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load purchase report.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsApplyingFilters(false);
    }
  }, [filters, session?.business_id]);

  React.useEffect(() => {
    void loadReport();
  }, [loadReport]);

  async function onExport(format: ReportExportFormat) {
    if (!session?.business_id) return;

    setIsExporting(format);
    setError(null);
    try {
      const bytes = await reportService.exportPurchaseReport(session.business_id, format, filters);
      const result = await exportBinaryReportFile({ baseName: 'purchase-report', bytes, format });
      showToast(formatSavedFileMessage(result));
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Unable to export purchase report.');
    } finally {
      setIsExporting(null);
    }
  }

  if (isLoading) {
    return <CollectionScreenSkeleton metricCount={2} rowCount={3} showActionCard />;
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
            subtitle="Purchase totals and tax paid for the selected period."
            title="Purchase report"
          />

          <FiltersCard
            draftFilters={draftFilters}
            isApplying={isApplyingFilters}
            onApply={() => setFilters(draftFilters)}
            onChange={setDraftFilters}
            onStartApply={() => setIsApplyingFilters(true)}
          />
          <ExportCard
            csvBusy={isExporting === 'csv'}
            excelBusy={isExporting === 'excel'}
            onCsv={() => void onExport('csv')}
            onExcel={() => void onExport('excel')}
          />

          {report ? (
            <>
              <View className="flex-row gap-4">
                <MetricCard label="Total purchases" value={formatCurrency(Number(report.grand_total))} />
                <MetricCard label="Total tax" value={formatCurrency(Number(report.total_tax))} />
              </View>

              <MetricCardRow label="Invoices" value={String(report.invoice_count)} />

              <Card className="rounded-[28px]">
                <CardHeader>
                  <CardTitle>Purchase summary</CardTitle>
                  <CardDescription>Taxable value and GST split for purchases.</CardDescription>
                </CardHeader>
                <CardContent className="gap-3">
                  <SummaryRow label="Taxable amount" value={formatCurrency(Number(report.taxable_amount))} />
                  <SummaryRow label="CGST" value={formatCurrency(Number(report.cgst_amount))} />
                  <SummaryRow label="SGST" value={formatCurrency(Number(report.sgst_amount))} />
                  <SummaryRow label="IGST" value={formatCurrency(Number(report.igst_amount))} />
                  <SummaryRow label="Grand total" value={formatCurrency(Number(report.grand_total))} />
                </CardContent>
              </Card>
            </>
          ) : (
            <EmptyState title="No purchase data found" />
          )}

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
        <CardDescription>Use `YYYY-MM-DD` format for both dates.</CardDescription>
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

function ExportCard({
  csvBusy,
  excelBusy,
  onCsv,
  onExcel,
}: {
  csvBusy: boolean;
  excelBusy: boolean;
  onCsv: () => void;
  onExcel: () => void;
}) {
  return (
    <Card className="rounded-[28px]">
      <CardHeader>
        <CardTitle>Export</CardTitle>
      </CardHeader>
      <CardContent className="flex-row gap-3">
        <Button variant="outline" className="h-12 flex-1 rounded-2xl" disabled={csvBusy || excelBusy} onPress={onCsv}>
          {csvBusy ? <ActivityIndicator color="#0f172a" /> : <Icon as={FileText} className="text-foreground" size={16} />}
          <Text>CSV</Text>
        </Button>
        <Button variant="outline" className="h-12 flex-1 rounded-2xl" disabled={csvBusy || excelBusy} onPress={onExcel}>
          {excelBusy ? <ActivityIndicator color="#0f172a" /> : <Icon as={FileSpreadsheet} className="text-foreground" size={16} />}
          <Text>Excel</Text>
        </Button>
      </CardContent>
    </Card>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex-1 rounded-[28px]">
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <Text className="text-2xl font-extrabold text-foreground">{value}</Text>
      </CardContent>
    </Card>
  );
}

function MetricCardRow({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-[28px]">
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <Text className="text-2xl font-extrabold text-foreground">{value}</Text>
      </CardContent>
    </Card>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-border/70 bg-background px-4 py-4">
      <View className="rounded-2xl bg-primary/10 px-3 py-3">
        <Icon as={ShoppingCart} className="text-primary" size={18} />
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-sm text-muted-foreground">{label}</Text>
        <Text className="font-semibold text-foreground">{value}</Text>
      </View>
    </View>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <Card className="rounded-[28px]">
      <CardContent className="items-center gap-3 px-5 py-8">
        <View className="rounded-[22px] bg-primary/10 px-4 py-4">
          <Icon as={ShoppingCart} className="text-primary" size={22} />
        </View>
        <Text className="font-semibold text-foreground">{title}</Text>
      </CardContent>
    </Card>
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
