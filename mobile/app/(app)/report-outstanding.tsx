import * as React from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileSpreadsheet, FileText, TrendingDown, TrendingUp, Users } from 'lucide-react-native';

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
import type { OutstandingParty, OutstandingReport } from '@/types/report';

export default function ReportOutstandingScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const { message, showToast } = useTimedToast();
  const [report, setReport] = React.useState<OutstandingReport | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
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
      const data = await reportService.getOutstandingReport(session.business_id);
      setReport(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load outstanding report.');
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
      const bytes = await reportService.exportOutstandingReport(session.business_id, format);
      const result = await exportBinaryReportFile({ baseName: 'outstanding-report', bytes, format });
      showToast(formatSavedFileMessage(result));
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Unable to export outstanding report.');
    } finally {
      setIsExporting(null);
    }
  }

  if (isLoading) {
    return <CollectionScreenSkeleton metricCount={2} rowCount={4} showActionCard />;
  }

  const receivable = Number(report?.summary.total_receivable ?? 0);
  const payable = Math.abs(Number(report?.summary.total_payable ?? 0));
  const receivableParties = report?.parties.filter((party) => Number(party.current_balance) > 0) ?? [];
  const payableParties = report?.parties.filter((party) => Number(party.current_balance) < 0) ?? [];

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
            subtitle="Track who owes you money and who you still need to pay."
            title="Outstanding report"
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

          <View className="flex-row gap-4">
            <MetricCard icon={TrendingUp} label="Receivable" value={formatCurrency(receivable)} />
            <MetricCard icon={TrendingDown} label="Payable" value={formatCurrency(payable)} />
          </View>

          <PartySection
            title="Receivables"
            emptyText="No receivables right now."
            icon={TrendingUp}
            parties={receivableParties}
            onPressParty={(party) => router.push({ pathname: '/(app)/party-detail', params: { id: party.id } })}
          />
          <PartySection
            title="Payables"
            emptyText="No payables right now."
            icon={TrendingDown}
            parties={payableParties}
            onPressParty={(party) => router.push({ pathname: '/(app)/party-detail', params: { id: party.id } })}
          />

          {error ? <ErrorCard error={error} /> : null}
        </View>
      </ScrollView>
      <ToastBanner message={message} variant="success" />
    </SafeAreaView>
  );
}

function MetricCard({ icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <Card className="flex-1 rounded-[28px]">
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

function PartySection({
  emptyText,
  icon,
  onPressParty,
  parties,
  title,
}: {
  emptyText: string;
  icon: typeof Users;
  onPressParty: (party: OutstandingParty) => void;
  parties: OutstandingParty[];
  title: string;
}) {
  return (
    <Card className="rounded-[28px]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{parties.length} party(s)</CardDescription>
      </CardHeader>
      <CardContent className="gap-3">
        {parties.length ? parties.map((party) => (
          <Pressable key={party.id} className="rounded-[24px] border border-border/70 bg-background px-4 py-4" onPress={() => onPressParty(party)}>
            <View className="flex-row items-center gap-4">
              <View className="rounded-2xl bg-primary/10 px-3 py-3">
                <Icon as={icon} className="text-primary" size={18} />
              </View>
              <View className="flex-1 gap-1">
                <Text className="font-semibold text-foreground">{party.name}</Text>
                <Text className="text-sm capitalize text-muted-foreground">{party.party_type}</Text>
              </View>
              <Text className="font-semibold text-foreground">{formatCurrency(Math.abs(Number(party.current_balance)))}</Text>
            </View>
          </Pressable>
        )) : (
          <View className="rounded-[24px] border border-dashed border-border/70 bg-muted/20 px-5 py-8">
            <Text className="text-center text-sm leading-6 text-muted-foreground">{emptyText}</Text>
          </View>
        )}
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
