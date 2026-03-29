import * as React from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Boxes, FileSpreadsheet, FileText } from 'lucide-react-native';

import { CollectionScreenSkeleton } from '@/components/screen-skeleton';
import { SubpageHeader } from '@/components/subpage-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ToastBanner, useTimedToast } from '@/components/ui/toast-banner';
import { exportBinaryReportFile, formatSavedFileMessage } from '@/lib/report-export';
import { formatCurrency } from '@/lib/formatters';
import { reportService, type ReportExportFormat } from '@/services/report.service';
import { useAuthStore } from '@/store/auth-store';
import type { LowStockReportItem } from '@/types/report';

export default function ReportLowStockScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const { message, showToast } = useTimedToast();
  const [items, setItems] = React.useState<LowStockReportItem[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState<ReportExportFormat | null>(null);

  const loadReport = React.useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (!session?.business_id) {
      setItems([]);
      setError('Select a business to view reports.');
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    if (mode === 'initial') setIsLoading(true);
    else setIsRefreshing(true);

    try {
      setError(null);
      const data = await reportService.getLowStockReport(session.business_id);
      setItems(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load low stock report.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [session?.business_id]);

  React.useEffect(() => {
    void loadReport();
  }, [loadReport]);

  async function onExport(format: ReportExportFormat) {
    if (!session?.business_id) return;

    setIsExporting(format);
    setError(null);
    try {
      const bytes = await reportService.exportLowStockReport(session.business_id, format);
      const result = await exportBinaryReportFile({ baseName: 'low-stock-report', bytes, format });
      showToast(formatSavedFileMessage(result));
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Unable to export low stock report.');
    } finally {
      setIsExporting(null);
    }
  }

  if (isLoading) {
    return <CollectionScreenSkeleton metricCount={1} rowCount={5} showActionCard />;
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
            subtitle="Inventory items below threshold, ready for action or export."
            title="Low stock report"
          />

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

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Items</CardTitle>
              <CardDescription>{items.length} low-stock item(s)</CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              {items.length ? items.map((item) => (
                <Pressable key={item.id} className="rounded-[24px] border border-border/70 bg-background px-4 py-4" onPress={() => router.push({ pathname: '/(app)/inventory-edit', params: { id: item.id } })}>
                  <View className="flex-row items-center gap-4">
                    <View className="rounded-2xl bg-primary/10 px-3 py-3">
                      <Icon as={Boxes} className="text-primary" size={18} />
                    </View>
                    <View className="flex-1 gap-1">
                      <Text className="font-semibold text-foreground">{item.name}</Text>
                      <Text className="text-sm leading-5 text-muted-foreground">
                        {item.current_stock} {item.unit} left | threshold {item.low_stock_threshold}
                      </Text>
                    </View>
                    <Text className="font-semibold text-foreground">{formatCurrency(Number(item.selling_price))}</Text>
                  </View>
                </Pressable>
              )) : (
                <View className="rounded-[24px] border border-dashed border-border/70 bg-muted/20 px-5 py-8">
                  <Text className="text-center text-sm leading-6 text-muted-foreground">No low-stock items right now.</Text>
                </View>
              )}
            </CardContent>
          </Card>

          {error ? <ErrorCard error={error} /> : null}
        </View>
      </ScrollView>
      <ToastBanner message={message} variant="success" />
    </SafeAreaView>
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
