import * as React from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BookOpenText, ChevronDown, CircleDollarSign, Download, ReceiptText, Search } from "lucide-react-native";

import { CollectionScreenSkeleton } from "@/components/screen-skeleton";
import { SubpageHeader } from "@/components/subpage-header";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { ToastBanner, useTimedToast } from "@/components/ui/toast-banner";
import { formatCurrency, formatShortDate } from "@/lib/formatters";
import { buildCsvFromRows, exportCsvText, formatSavedFileMessage } from "@/lib/report-export";
import { ledgerService } from "@/services/ledger.service";
import { partyService } from "@/services/party.service";
import { useAuthStore } from "@/store/auth-store";
import type { LedgerEntry } from "@/types/ledger";
import type { Party } from "@/types/party";

function getDefaultRange(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);

  return {
    from_date: start.toISOString().slice(0, 10),
    to_date: end.toISOString().slice(0, 10),
  };
}

export default function LedgerScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const { message, showToast } = useTimedToast();
  const [entries, setEntries] = React.useState<LedgerEntry[]>([]);
  const [parties, setParties] = React.useState<Party[]>([]);
  const [selectedPartyId, setSelectedPartyId] = React.useState("");
  const [partySearch, setPartySearch] = React.useState("");
  const [dateRange, setDateRange] = React.useState<"30d" | "90d" | "all">("30d");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isPartyPickerOpen, setIsPartyPickerOpen] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);

  const selectedParty = React.useMemo(
    () => parties.find((party) => party.id === selectedPartyId) ?? null,
    [parties, selectedPartyId],
  );

  const filteredParties = React.useMemo(() => {
    const query = partySearch.trim().toLowerCase();
    if (!query) {
      return parties;
    }

    return parties.filter((party) => {
      return (
        party.name.toLowerCase().includes(query) ||
        party.phone?.toLowerCase().includes(query) ||
        party.email?.toLowerCase().includes(query)
      );
    });
  }, [parties, partySearch]);

  const loadLedger = React.useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!session?.business_id) {
        setEntries([]);
        setParties([]);
        setError("Select a business to view ledger statements.");
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (mode === "initial") {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        setError(null);
        const range =
          dateRange === "all"
            ? {}
            : getDefaultRange(dateRange === "30d" ? 30 : 90);

        const [partyRows, ledgerRows] = await Promise.all([
          partyService.listParties(session.business_id, { include_inactive: "false" }),
          ledgerService.getLedgerStatement(session.business_id, {
            party_id: selectedPartyId || undefined,
            limit: 100,
            ...range,
          }),
        ]);

        setParties(partyRows);
        setEntries(ledgerRows.items);
      } catch (loadError: any) {
        setError(
          loadError?.response?.data?.error?.message ??
            loadError?.response?.data?.message ??
            loadError?.message ??
            "Unable to load ledger statements.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [dateRange, selectedPartyId, session?.business_id],
  );

  React.useEffect(() => {
    void loadLedger();
  }, [loadLedger]);

  const totals = React.useMemo(() => {
    return entries.reduce(
      (acc, entry) => {
        acc.debit += entry.debit;
        acc.credit += entry.credit;
        return acc;
      },
      { credit: 0, debit: 0 },
    );
  }, [entries]);

  const closingBalance = entries[0]?.balance_after ?? 0;

  async function onExportLedger() {
    setIsExporting(true);
    setError(null);

    try {
      const csv = buildCsvFromRows(
        entries.map((entry) => ({
          date: entry.entry_date,
          party: entry.party_name,
          description: entry.description,
          entry_type: entry.entry_type,
          reference_type: entry.reference_type ?? "",
          debit: entry.debit,
          credit: entry.credit,
          balance_after: entry.balance_after,
        })),
      );

      const result = await exportCsvText({
        baseName: selectedParty ? `ledger-${selectedParty.name.replace(/\s+/g, "-").toLowerCase()}` : "ledger-statement",
        content: csv,
      });
      showToast(formatSavedFileMessage(result));
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Unable to export ledger statement.");
    } finally {
      setIsExporting(false);
    }
  }

  if (isLoading) {
    return <CollectionScreenSkeleton metricCount={2} rowCount={5} showActionCard />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-6 pb-28 pt-4"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadLedger("refresh")} />}>
        <View className="gap-6">
          <SubpageHeader
            backHref="/(app)/customers"
            eyebrow="Ledger"
            subtitle="Party-wise statement view with recent entries, balances, and document links."
            title="Ledger statement"
          />

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Choose a party and date window for the statement.</CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              <View className="gap-2">
                <Label>Party</Label>
                <Pressable
                  className="flex-row items-center gap-4 rounded-[24px] border border-border/70 bg-background px-4 py-4"
                  onPress={() => setIsPartyPickerOpen(true)}>
                  <View className="rounded-2xl bg-primary/10 px-3 py-3">
                    <Icon as={BookOpenText} className="text-primary" size={18} />
                  </View>
                  <View className="flex-1 gap-1">
                    <Text className="text-sm text-muted-foreground">Ledger account</Text>
                    <Text className="font-semibold text-foreground">{selectedParty ? selectedParty.name : "All parties"}</Text>
                  </View>
                  <Icon as={ChevronDown} className="text-muted-foreground" size={18} />
                </Pressable>
              </View>

              <View className="gap-2">
                <Label>Date range</Label>
                <View className="flex-row gap-3">
                  <RangeChip label="30 days" selected={dateRange === "30d"} onPress={() => setDateRange("30d")} />
                  <RangeChip label="90 days" selected={dateRange === "90d"} onPress={() => setDateRange("90d")} />
                  <RangeChip label="All" selected={dateRange === "all"} onPress={() => setDateRange("all")} />
                </View>
              </View>
            </CardContent>
          </Card>

          <View className="flex-row gap-4">
            <SummaryPill label="Debit" value={formatCurrency(totals.debit)} />
            <SummaryPill label="Credit" value={formatCurrency(totals.credit)} />
          </View>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Closing balance</CardTitle>
              <CardDescription>Latest running balance for the current statement view.</CardDescription>
            </CardHeader>
            <CardContent>
              <Text className="text-3xl font-extrabold text-foreground">{formatCurrency(closingBalance)}</Text>
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Export</CardTitle>
              <CardDescription>Share the current filtered ledger statement as CSV.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="h-12 rounded-2xl" disabled={isExporting || entries.length === 0} onPress={() => void onExportLedger()}>
                {isExporting ? <ActivityIndicator color="#0f172a" /> : <Icon as={Download} className="text-foreground" size={16} />}
                <Text>Export CSV</Text>
              </Button>
            </CardContent>
          </Card>

          {error ? (
            <Card className="rounded-[28px] border-destructive/20 bg-destructive/5">
              <CardContent className="gap-4 px-5 py-5">
                <Text className="font-semibold text-foreground">Ledger sync failed</Text>
                <Text className="text-sm leading-6 text-muted-foreground">{error}</Text>
                <Button className="h-12 rounded-2xl" onPress={() => void loadLedger()}>
                  <Text>Retry ledger sync</Text>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Statement entries</CardTitle>
              <CardDescription>{entries.length} entries in the current statement view.</CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              {entries.length ? (
                entries.map((entry) => (
                  <Pressable
                    key={entry.id}
                    className="rounded-[24px] border border-border/70 bg-background px-4 py-4"
                    onPress={() => {
                      if (entry.reference_type === "invoice" && entry.reference_id) {
                        router.push({ pathname: "/(app)/invoice-detail", params: { id: entry.reference_id } });
                        return;
                      }

                      if (entry.reference_type === "payment" && entry.reference_id) {
                        router.push({ pathname: "/(app)/payment-detail", params: { id: entry.reference_id } });
                        return;
                      }

                      router.push({ pathname: "/(app)/party-detail", params: { id: entry.party_id } });
                    }}>
                    <View className="flex-row items-start gap-4">
                      <View className="rounded-2xl bg-primary/10 px-3 py-3">
                        <Icon as={entry.entry_type === "payment" ? CircleDollarSign : ReceiptText} className="text-primary" size={18} />
                      </View>
                      <View className="flex-1 gap-2">
                        <View className="flex-row items-start justify-between gap-4">
                          <View className="flex-1 gap-1">
                            <Text className="font-semibold text-foreground">{entry.description}</Text>
                            <Text className="text-sm leading-5 text-muted-foreground">{entry.party_name}</Text>
                          </View>
                          <Text className="text-xs uppercase tracking-[1px] text-muted-foreground">
                            {formatShortDate(entry.entry_date)}
                          </Text>
                        </View>

                        <View className="flex-row flex-wrap gap-3">
                          <LedgerAmount label="Debit" value={entry.debit} />
                          <LedgerAmount label="Credit" value={entry.credit} />
                          <LedgerAmount label="Balance" value={entry.balance_after} />
                        </View>
                      </View>
                    </View>
                  </Pressable>
                ))
              ) : (
                <View className="rounded-[24px] border border-dashed border-border/70 bg-muted/20 px-4 py-6">
                  <Text className="text-center text-sm leading-6 text-muted-foreground">
                    No ledger entries matched this party and date range.
                  </Text>
                </View>
              )}
            </CardContent>
          </Card>
        </View>
      </ScrollView>

      <Dialog open={isPartyPickerOpen} onOpenChange={setIsPartyPickerOpen}>
        <DialogContent className="max-w-[420px] rounded-[28px]">
          <DialogHeader>
            <DialogTitle>Choose ledger account</DialogTitle>
            <DialogDescription>Filter the statement down to one party or keep all entries visible.</DialogDescription>
          </DialogHeader>
          <View className="gap-4">
            <View className="relative">
              <View className="absolute left-4 top-3.5 z-10">
                <Icon as={Search} className="text-muted-foreground" size={18} />
              </View>
              <Input className="pl-11" value={partySearch} onChangeText={setPartySearch} placeholder="Search parties" />
            </View>
            <ScrollView className="max-h-[360px]">
              <View className="gap-3">
                <Pressable
                  className={`rounded-[22px] border px-4 py-4 ${selectedPartyId ? "border-border/70 bg-background" : "border-primary bg-primary/10"}`}
                  onPress={() => {
                    setSelectedPartyId("");
                    setIsPartyPickerOpen(false);
                  }}>
                  <Text className="font-semibold text-foreground">All parties</Text>
                </Pressable>
                {filteredParties.map((party) => (
                  <Pressable
                    key={party.id}
                    className={`rounded-[22px] border px-4 py-4 ${selectedPartyId === party.id ? "border-primary bg-primary/10" : "border-border/70 bg-background"}`}
                    onPress={() => {
                      setSelectedPartyId(party.id);
                      setIsPartyPickerOpen(false);
                    }}>
                    <Text className="font-semibold text-foreground">{party.name}</Text>
                    <Text className="mt-1 text-sm text-muted-foreground">
                      {party.phone || party.email || party.city || "No extra details"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        </DialogContent>
      </Dialog>
      <ToastBanner message={message} variant="success" />
    </SafeAreaView>
  );
}

function RangeChip({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      className={`rounded-full border px-4 py-3 ${selected ? "border-primary bg-primary" : "border-border/70 bg-background"}`}
      onPress={onPress}>
      <Text className={selected ? "text-primary-foreground" : "text-foreground"}>{label}</Text>
    </Pressable>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex-1 rounded-[28px]">
      <CardContent className="gap-2 px-5 py-5">
        <Text className="text-sm text-muted-foreground">{label}</Text>
        <Text className="text-2xl font-extrabold text-foreground">{value}</Text>
      </CardContent>
    </Card>
  );
}

function LedgerAmount({ label, value }: { label: string; value: number }) {
  return (
    <View className="min-w-[90px] flex-1 rounded-2xl border border-border/70 bg-muted/20 px-3 py-3">
      <Text className="text-xs uppercase tracking-[1px] text-muted-foreground">{label}</Text>
      <Text className="mt-1 font-semibold text-foreground">{formatCurrency(value)}</Text>
    </View>
  );
}
