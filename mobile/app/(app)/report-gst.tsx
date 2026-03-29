import * as React from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarRange, ChevronDown, FileSpreadsheet, FileText, ReceiptText } from 'lucide-react-native';

import { CollectionScreenSkeleton } from '@/components/screen-skeleton';
import { SubpageHeader } from '@/components/subpage-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { ToastBanner, useTimedToast } from '@/components/ui/toast-banner';
import { exportBinaryReportFile, formatSavedFileMessage, getDefaultReportRange } from '@/lib/report-export';
import { formatCurrency } from '@/lib/formatters';
import { reportService, type ReportExportFormat } from '@/services/report.service';
import { useAuthStore } from '@/store/auth-store';
import type { GstSummaryReport } from '@/types/report';

const GST_TYPES = [
  { label: 'Sales', value: 'sales' as const },
  { label: 'Purchase', value: 'purchase' as const },
  { label: 'Credit note', value: 'credit_note' as const },
  { label: 'Debit note', value: 'debit_note' as const },
];

type GstInvoiceType = (typeof GST_TYPES)[number]['value'];
type GstFilters = { from_date: string; to_date: string; invoice_type: GstInvoiceType };

export default function ReportGstScreen() {
  const { session } = useAuthStore();
  const { message, showToast } = useTimedToast();
  const [report, setReport] = React.useState<GstSummaryReport | null>(null);
  const [filters, setFilters] = React.useState<GstFilters>({ ...getDefaultReportRange(), invoice_type: 'sales' });
  const [draftFilters, setDraftFilters] = React.useState<GstFilters>({ ...getDefaultReportRange(), invoice_type: 'sales' });
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isTypePickerOpen, setIsTypePickerOpen] = React.useState(false);
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
      const data = await reportService.getGstSummaryReport(session.business_id, filters);
      setReport(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load GST report.');
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
      const bytes = await reportService.exportGstSummaryReport(session.business_id, format, filters);
      const result = await exportBinaryReportFile({ baseName: 'gst-report', bytes, format });
      showToast(formatSavedFileMessage(result));
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Unable to export GST report.');
    } finally {
      setIsExporting(null);
    }
  }

  if (isLoading) {
    return <CollectionScreenSkeleton metricCount={2} rowCount={3} showActionCard />;
  }

  const selectedTypeLabel = GST_TYPES.find((item) => item.value === draftFilters.invoice_type)?.label ?? 'Sales';

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
            subtitle="GST summary with invoice-type filtering and export."
            title="GST report"
          />

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent className="gap-3">
              <Pressable className="flex-row items-center gap-3 rounded-[22px] border border-border/70 bg-muted/35 px-4 py-4" onPress={() => setIsTypePickerOpen(true)}>
                <View className="rounded-2xl bg-primary/10 px-3 py-3">
                  <Icon as={ReceiptText} className="text-primary" size={18} />
                </View>
                <View className="flex-1 gap-1">
                  <Text className="text-sm text-muted-foreground">Invoice type</Text>
                  <Text className="font-semibold text-foreground">{selectedTypeLabel}</Text>
                </View>
                <Icon as={ChevronDown} className="text-muted-foreground" size={18} />
              </Pressable>
              <FilterInput label="From date" value={draftFilters.from_date} onChangeText={(value) => setDraftFilters((current) => ({ ...current, from_date: value }))} />
              <FilterInput label="To date" value={draftFilters.to_date} onChangeText={(value) => setDraftFilters((current) => ({ ...current, to_date: value }))} />
              <Button className="h-12 rounded-2xl" disabled={isApplyingFilters} onPress={() => {
                setIsApplyingFilters(true);
                setFilters(draftFilters);
              }}>
                {isApplyingFilters ? <ActivityIndicator color="#ffffff" /> : null}
                <Text>{isApplyingFilters ? 'Applying...' : 'Apply filters'}</Text>
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Export</CardTitle>
            </CardHeader>
            <CardContent className="flex-row gap-3">
              <Button variant="outline" className="h-12 flex-1 rounded-2xl" disabled={!!isExporting} onPress={() => void onExport('csv')}>
                {isExporting === 'csv' ? <ActivityIndicator color="#0f172a" /> : <Icon as={FileText} className="text-foreground" size={16} />}
                <Text>CSV</Text>
              </Button>
              <Button variant="outline" className="h-12 flex-1 rounded-2xl" disabled={!!isExporting} onPress={() => void onExport('excel')}>
                {isExporting === 'excel' ? <ActivityIndicator color="#0f172a" /> : <Icon as={FileSpreadsheet} className="text-foreground" size={16} />}
                <Text>Excel</Text>
              </Button>
            </CardContent>
          </Card>

          {report ? (
            <>
              <View className="flex-row gap-4">
                <MetricCard label="Taxable" value={formatCurrency(Number(report.taxable_amount))} />
                <MetricCard label="Total tax" value={formatCurrency(Number(report.total_tax))} />
              </View>
              <MetricWideCard label="Grand total" value={formatCurrency(Number(report.grand_total))} />
              <Card className="rounded-[28px]">
                <CardHeader>
                  <CardTitle>GST breakdown</CardTitle>
                </CardHeader>
                <CardContent className="gap-3">
                  <SummaryRow label="CGST" value={formatCurrency(Number(report.cgst_amount))} />
                  <SummaryRow label="SGST" value={formatCurrency(Number(report.sgst_amount))} />
                  <SummaryRow label="IGST" value={formatCurrency(Number(report.igst_amount))} />
                </CardContent>
              </Card>
            </>
          ) : null}

          {error ? <ErrorCard error={error} /> : null}
        </View>
      </ScrollView>

      <Dialog open={isTypePickerOpen} onOpenChange={setIsTypePickerOpen}>
        <DialogContent className="max-w-[420px] rounded-[28px]">
          <DialogHeader>
            <DialogTitle>Select invoice type</DialogTitle>
            <DialogDescription>Choose the GST bucket used for this report.</DialogDescription>
          </DialogHeader>
          <View className="gap-3">
            {GST_TYPES.map((item) => (
              <Pressable
                key={item.value}
                className={`rounded-[22px] border px-4 py-4 ${draftFilters.invoice_type === item.value ? 'border-primary bg-primary/10' : 'border-border/70 bg-background'}`}
                onPress={() => {
                  setDraftFilters((current) => ({ ...current, invoice_type: item.value }));
                  setIsTypePickerOpen(false);
                }}>
                <Text className="font-semibold text-foreground">{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </DialogContent>
      </Dialog>
      <ToastBanner message={message} variant="success" />
    </SafeAreaView>
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="rounded-2xl border border-border/70 bg-background px-4 py-4">
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
