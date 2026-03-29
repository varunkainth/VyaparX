import * as React from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarRange, Download, FileSpreadsheet, FileText, TrendingUp } from 'lucide-react-native';

import { CollectionScreenSkeleton } from '@/components/screen-skeleton';
import { SubpageHeader } from '@/components/subpage-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { ToastBanner, useTimedToast } from '@/components/ui/toast-banner';
import { exportBinaryReportFile, formatSavedFileMessage, getDefaultReportRange } from '@/lib/report-export';
import { formatCurrency, formatMonthLabel } from '@/lib/formatters';
import { reportService, type ReportExportFormat } from '@/services/report.service';
import { useAuthStore } from '@/store/auth-store';
import type { MonthlySalesReportItem } from '@/types/report';

export default function ReportSalesScreen() {
  const { session } = useAuthStore();
  const { message, showToast } = useTimedToast();
  const [reports, setReports] = React.useState<MonthlySalesReportItem[]>([]);
  const [filters, setFilters] = React.useState(getDefaultReportRange);
  const [draftFilters, setDraftFilters] = React.useState(getDefaultReportRange);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isApplyingFilters, setIsApplyingFilters] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState<ReportExportFormat | null>(null);

  const loadReports = React.useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (!session?.business_id) {
      setReports([]);
      setError('Select a business to view reports.');
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    if (mode === 'initial') setIsLoading(true);
    else setIsRefreshing(true);

    try {
      setError(null);
      const data = await reportService.getMonthlySalesReport(session.business_id, filters);
      setReports(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load sales report.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsApplyingFilters(false);
    }
  }, [filters, session?.business_id]);

  React.useEffect(() => {
    void loadReports();
  }, [loadReports]);

  async function onExport(format: ReportExportFormat) {
    if (!session?.business_id) return;

    setIsExporting(format);
    setError(null);
    try {
      const bytes = await reportService.exportMonthlySalesReport(session.business_id, format, filters);
      const result = await exportBinaryReportFile({
        baseName: 'sales-report',
        bytes,
        format,
      });
      showToast(formatSavedFileMessage(result));
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Unable to export sales report.');
    } finally {
      setIsExporting(null);
    }
  }

  const totalSales = reports.reduce((sum, report) => sum + Number(report.grand_total), 0);
  const totalTax = reports.reduce((sum, report) => sum + Number(report.total_tax), 0);
  const totalInvoices = reports.reduce((sum, report) => sum + report.invoice_count, 0);

  if (isLoading) {
    return <CollectionScreenSkeleton metricCount={2} rowCount={4} showActionCard />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-6 pb-28 pt-4"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadReports('refresh')} />}>
        <View className="gap-6">
          <SubpageHeader
            backHref="/(app)/reports"
            eyebrow="Reports"
            subtitle="Monthly billing totals with export support for finance review."
            title="Sales report"
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

          <View className="flex-row gap-4">
            <MetricCard label="Total sales" value={formatCurrency(totalSales)} />
            <MetricCard label="Invoices" value={String(totalInvoices)} />
          </View>

          <MetricWideCard label="Total tax collected" value={formatCurrency(totalTax)} />

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Monthly sales</CardTitle>
              <CardDescription>
                {reports.length ? `${reports.length} monthly bucket(s) in the selected range.` : 'No sales data found.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              {reports.length ? reports.map((report) => (
                <View key={report.month} className="rounded-[24px] border border-border/70 bg-background px-4 py-4">
                  <View className="flex-row items-start gap-4">
                    <View className="rounded-2xl bg-primary/10 px-3 py-3">
                      <Icon as={TrendingUp} className="text-primary" size={18} />
                    </View>
                    <View className="flex-1 gap-3">
                      <View className="flex-row items-start justify-between gap-3">
                        <View className="flex-1 gap-1">
                          <Text className="font-semibold text-foreground">{formatMonthLabel(report.month)}</Text>
                          <Text className="text-sm text-muted-foreground">{report.invoice_count} invoices</Text>
                        </View>
                        <Text className="font-semibold text-foreground">{formatCurrency(Number(report.grand_total))}</Text>
                      </View>
                      <View className="flex-row gap-3">
                        <MiniStat label="Taxable" value={formatCurrency(Number(report.taxable_amount))} />
                        <MiniStat label="Tax" value={formatCurrency(Number(report.total_tax))} />
                      </View>
                    </View>
                  </View>
                </View>
              )) : <EmptyReportState title="No sales data yet" />}
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
        <CardDescription>Use `YYYY-MM-DD` format for both dates.</CardDescription>
      </CardHeader>
      <CardContent className="gap-3">
        <FilterInput
          icon={CalendarRange}
          label="From date"
          value={draftFilters.from_date}
          onChangeText={(value) => onChange((current) => ({ ...current, from_date: value }))}
        />
        <FilterInput
          icon={CalendarRange}
          label="To date"
          value={draftFilters.to_date}
          onChangeText={(value) => onChange((current) => ({ ...current, to_date: value }))}
        />
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
        <CardDescription>Share this report as CSV or Excel.</CardDescription>
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

function FilterInput({
  icon,
  label,
  onChangeText,
  value,
}: {
  icon: typeof CalendarRange;
  label: string;
  onChangeText: (value: string) => void;
  value: string;
}) {
  return (
    <View className="gap-2">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <View className="flex-row items-center gap-3 rounded-[22px] border border-border/70 bg-muted/35 px-4">
        <Icon as={icon} className="text-muted-foreground" size={18} />
        <Input className="h-14 flex-1 border-0 bg-transparent px-0" value={value} onChangeText={onChangeText} />
      </View>
    </View>
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

function MetricWideCard({ label, value }: { label: string; value: string }) {
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-2xl border border-border/60 bg-card px-3 py-3">
      <Text className="text-xs uppercase tracking-[1px] text-muted-foreground">{label}</Text>
      <Text className="mt-1 font-semibold text-foreground">{value}</Text>
    </View>
  );
}

function EmptyReportState({ title }: { title: string }) {
  return (
    <View className="items-center gap-3 rounded-[24px] border border-dashed border-border/70 bg-muted/20 px-5 py-8">
      <View className="rounded-[22px] bg-primary/10 px-4 py-4">
        <Icon as={Download} className="text-primary" size={22} />
      </View>
      <Text className="font-semibold text-foreground">{title}</Text>
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
