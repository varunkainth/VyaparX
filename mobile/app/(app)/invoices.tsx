import * as React from "react";
import { Pressable, RefreshControl, ScrollView, Switch, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowUpRight,
  ChevronUp,
  CreditCard,
  FileText,
  Plus,
  ReceiptText,
  Search,
  TriangleAlert,
  TrendingDown,
  TrendingUp,
} from "lucide-react-native";

import { ToastBanner, useTimedToast } from "@/components/ui/toast-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DevCacheIndicator } from "@/components/dev-cache-indicator";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { CACHE_TTL_MS, formatCacheAge, isCacheStale } from "@/lib/cache-policy";
import { formatCompactNumber, formatCurrency, formatShortDate } from "@/lib/formatters";
import { useAuthStore } from "@/store/auth-store";
import { getInvoiceCacheKey, useInvoiceStore } from "@/store/invoice-store";
import type { Invoice, InvoiceType, PaymentStatus } from "@/types/invoice";

const INVOICE_TYPE_FILTERS: Array<{ label: string; value: InvoiceType | "all" }> = [
  { label: "All", value: "all" },
  { label: "Sales", value: "sales" },
  { label: "Purchase", value: "purchase" },
];

const PAYMENT_STATUS_FILTERS: Array<{ label: string; value: PaymentStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Unpaid", value: "unpaid" },
  { label: "Partial", value: "partial" },
  { label: "Paid", value: "paid" },
  { label: "Overdue", value: "overdue" },
];

export default function InvoicesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ refresh?: string; toast?: string }>();
  const { session } = useAuthStore();
  const ensureInvoices = useInvoiceStore((state) => state.ensureInvoices);
  const { message, showToast } = useTimedToast();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [includeCancelled, setIncludeCancelled] = React.useState(false);
  const [invoiceTypeFilter, setInvoiceTypeFilter] = React.useState<InvoiceType | "all">("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = React.useState<PaymentStatus | "all">("all");
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isFabOpen, setIsFabOpen] = React.useState(false);
  const handledRefreshRef = React.useRef<string | null>(null);
  const handledToastRef = React.useRef<string | null>(null);
  const hasFocusedOnceRef = React.useRef(false);
  const invoiceCache = useInvoiceStore((state) =>
    session?.business_id ? state.cache[getInvoiceCacheKey(session.business_id, includeCancelled)] : undefined
  );
  const invoices = invoiceCache?.items ?? [];
  const cacheError = invoiceCache?.error ?? null;
  const invoiceCacheState =
    invoiceCache?.status === "loading"
      ? "refreshing"
      : invoices.length
        ? isCacheStale(invoiceCache?.updatedAt, CACHE_TTL_MS.invoiceList)
          ? "stale"
          : "cached"
        : "empty";

  const loadInvoices = React.useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!session?.business_id) {
        setError("Select a business to view invoices.");
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
        await ensureInvoices(session.business_id, includeCancelled, mode === "refresh");
      } catch (loadError: any) {
        setError(
          loadError?.response?.data?.error?.message ??
            loadError?.response?.data?.message ??
            loadError?.message ??
            "Unable to load invoices.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [ensureInvoices, includeCancelled, session?.business_id],
  );

  React.useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  useFocusEffect(
    React.useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }

      void loadInvoices("refresh");
    }, [loadInvoices]),
  );

  React.useEffect(() => {
    if (!params.toast || params.toast === handledToastRef.current) return;
    handledToastRef.current = params.toast;
    showToast(params.toast);
  }, [params.toast, showToast]);

  React.useEffect(() => {
    if (!params.refresh || params.refresh === handledRefreshRef.current) return;
    handledRefreshRef.current = params.refresh;
    void loadInvoices("refresh");
  }, [loadInvoices, params.refresh]);

  const filteredInvoices = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const invoiceNumber = String(invoice.invoice_number ?? "").toLowerCase();
      const partyName = String(invoice.party_name ?? "").toLowerCase();
      const notes = typeof invoice.notes === "string" ? invoice.notes.toLowerCase() : "";

      if (invoiceTypeFilter !== "all" && invoice.invoice_type !== invoiceTypeFilter) {
        return false;
      }

      if (paymentStatusFilter !== "all" && invoice.payment_status !== paymentStatusFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        invoiceNumber.includes(query) ||
        partyName.includes(query) ||
        notes.includes(query)
      );
    });
  }, [invoiceTypeFilter, invoices, paymentStatusFilter, searchQuery]);

  const stats = React.useMemo(() => {
    const activeInvoices = invoices.filter((invoice) => !invoice.is_cancelled);
    return {
      count: activeInvoices.length,
      salesTotal: activeInvoices
        .filter((invoice) => invoice.invoice_type === "sales")
        .reduce((sum, invoice) => sum + invoice.grand_total, 0),
      purchaseTotal: activeInvoices
        .filter((invoice) => invoice.invoice_type === "purchase")
        .reduce((sum, invoice) => sum + invoice.grand_total, 0),
      overdueCount: activeInvoices.filter((invoice) => invoice.payment_status === "overdue").length,
    };
  }, [invoices]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="absolute -left-12 top-16 h-32 w-32 rounded-full bg-primary/8" />
      <View className="absolute right-0 top-40 h-28 w-28 rounded-full bg-secondary/70" />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-6 pb-28 pt-4"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadInvoices("refresh")} />}>
        <View className="gap-6">
          {isLoading ? <InvoicesScreenSkeleton /> : null}

          {!isLoading ? (
          <>
          <View className="gap-2">
            <DevCacheIndicator
              label="invoices"
              state={invoiceCacheState}
              detail={formatCacheAge(invoiceCache?.updatedAt)}
            />
            <Text className="text-sm uppercase tracking-[2px] text-muted-foreground">Invoices</Text>
            <Text className="text-3xl font-extrabold tracking-tight text-foreground">Billing desk</Text>
            <Text className="text-base leading-6 text-muted-foreground">
              Track sales and purchase invoices, dues, and payment follow-up for the active business.
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-4">
            <MiniPill icon={ReceiptText} label={`${stats.count} active invoices`} />
            <MiniPill icon={TrendingUp} label={`${formatCompactNumber(stats.salesTotal)} sales`} />
            <MiniPill icon={TrendingDown} label={`${formatCompactNumber(stats.purchaseTotal)} purchases`} />
            <MiniPill icon={TriangleAlert} label={`${stats.overdueCount} overdue`} />
          </View>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Search invoices and narrow the list by type, payment status, or cancelled records.</CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              <View className="relative">
                <View className="absolute left-4 top-3.5 z-10">
                  <Icon as={Search} className="text-muted-foreground" size={18} />
                </View>
                <Input
                  className="pl-11"
                  placeholder="Search by invoice number, party, or notes"
                  returnKeyType="search"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <FilterRow
                label="Invoice type"
                options={INVOICE_TYPE_FILTERS}
                value={invoiceTypeFilter}
                onChange={(value) => setInvoiceTypeFilter(value as InvoiceType | "all")}
              />

              <FilterRow
                label="Payment status"
                options={PAYMENT_STATUS_FILTERS}
                value={paymentStatusFilter}
                onChange={(value) => setPaymentStatusFilter(value as PaymentStatus | "all")}
              />

              <View className="flex-row items-center gap-4 rounded-2xl border border-border/70 bg-background px-4 py-4">
                <View className="flex-1 gap-1">
                  <Text className="font-medium text-foreground">Include cancelled</Text>
                  <Text className="text-sm leading-5 text-muted-foreground">
                    Keep cancelled invoices visible in the billing timeline.
                  </Text>
                </View>
                <Switch onValueChange={setIncludeCancelled} value={includeCancelled} />
              </View>
            </CardContent>
          </Card>

          {error || cacheError ? (
            <Card className="rounded-[28px] border-destructive/20 bg-destructive/5">
              <CardContent className="gap-4 px-5 py-5">
                <Text className="font-semibold text-foreground">Invoice sync failed</Text>
                <Text className="text-sm leading-6 text-muted-foreground">{error ?? cacheError}</Text>
                <Button className="h-12 rounded-2xl" onPress={() => void loadInvoices()}>
                  <Text>Retry invoice sync</Text>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>
                {filteredInvoices.length} results shown {searchQuery ? `for "${searchQuery.trim()}"` : "in this business"}.
              </CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              {filteredInvoices.length ? (
                filteredInvoices.map((invoice) => (
                  <Pressable
                    key={invoice.id}
                    className={`rounded-[24px] border px-4 py-4 ${
                      invoice.is_cancelled
                        ? "border-destructive/20 bg-destructive/5"
                        : "border-border/70 bg-background"
                    }`}
                    onPress={() =>
                      router.push({ pathname: "/(app)/invoice-detail", params: { id: invoice.id } })
                    }>
                    <View className="flex-row items-start gap-4">
                      <View className="rounded-2xl bg-primary/10 px-3 py-3">
                        <Icon as={FileText} className="text-primary" size={18} />
                      </View>
                      <View className="flex-1 gap-3">
                        <View className="flex-row items-start justify-between gap-4">
                          <View className="flex-1 gap-1">
                            <Text className="font-semibold text-foreground">{invoice.invoice_number}</Text>
                            <Text className="text-sm leading-5 text-muted-foreground">
                              {formatInvoicePartyName(invoice.party_name)}
                            </Text>
                          </View>
                          <Text className="text-sm font-semibold text-foreground">{formatCurrency(invoice.grand_total)}</Text>
                        </View>

                        <View className="flex-row flex-wrap gap-2">
                          <StatusBadge label={formatInvoiceType(invoice.invoice_type)} tone={invoice.invoice_type === "sales" ? "blue" : "slate"} />
                          <StatusBadge label={formatPaymentStatus(invoice.payment_status)} tone={paymentTone(invoice.payment_status)} />
                          {invoice.is_cancelled ? <StatusBadge label="Cancelled" tone="red" /> : null}
                          {invoice.reference_invoice_id ? <StatusBadge label="Revised" tone="amber" /> : null}
                        </View>

                        <Text className="text-xs uppercase tracking-[1px] text-muted-foreground">
                          {formatShortDate(invoice.invoice_date)}
                          {invoice.due_date ? ` | Due ${formatShortDate(invoice.due_date)}` : ""}
                          {invoice.balance_due > 0 ? ` | Due ${formatCurrency(invoice.balance_due)}` : ""}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))
              ) : (
                <EmptyState hasFilters={Boolean(searchQuery.trim()) || invoiceTypeFilter !== "all" || paymentStatusFilter !== "all"} />
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Collections tools</CardTitle>
              <CardDescription>Move into the payments desk to review receipts and outflows.</CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              <Button
                variant="outline"
                className="h-14 justify-between rounded-2xl px-4"
                onPress={() => router.push("/(app)/payments")}>
                <View className="flex-row items-center gap-3">
                  <Icon as={CreditCard} className="text-primary" size={18} />
                  <Text>Payments</Text>
                </View>
                <Icon as={ArrowUpRight} className="text-muted-foreground" size={18} />
              </Button>
            </CardContent>
          </Card>
          </>
          ) : null}
        </View>
      </ScrollView>
      <InvoiceActionFab
        isOpen={isFabOpen}
        onCreatePurchase={() => {
          setIsFabOpen(false);
          router.push("/(app)/invoice-create-purchase");
        }}
        onCreateSales={() => {
          setIsFabOpen(false);
          router.push("/(app)/invoice-create-sales");
        }}
        onToggle={() => setIsFabOpen((current) => !current)}
      />
      <ToastBanner message={message} variant="success" />
    </SafeAreaView>
  );
}

function InvoicesScreenSkeleton() {
  return (
    <View className="gap-6">
      <View className="gap-3">
        <Skeleton className="h-4 w-20 rounded-full" />
        <Skeleton className="h-9 w-40 rounded-full" />
        <Skeleton className="h-5 w-full rounded-full" />
      </View>
      <View className="flex-row flex-wrap gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-16 min-w-[140px] flex-1 rounded-2xl" />
        ))}
      </View>
      <Skeleton className="h-72 w-full rounded-[28px]" />
      <Skeleton className="h-[420px] w-full rounded-[28px]" />
    </View>
  );
}

function MiniPill({ icon, label }: { icon: typeof ReceiptText; label: string }) {
  return (
    <View className="min-w-[140px] flex-1 flex-row items-center gap-3 rounded-2xl border border-border/70 bg-background px-4 py-4">
      <View className="rounded-2xl bg-primary/10 px-3 py-3">
        <Icon as={icon} className="text-primary" size={18} />
      </View>
      <Text className="flex-1 font-medium text-foreground">{label}</Text>
    </View>
  );
}

function FilterRow({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <View className="gap-2">
      <Text className="font-medium text-foreground">{label}</Text>
      <View className="flex-row flex-wrap gap-3">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              className={`rounded-[22px] border px-4 py-3 ${
                selected ? "border-primary bg-primary" : "border-border/70 bg-background"
              }`}
              onPress={() => onChange(option.value)}>
              <Text className={selected ? "text-primary-foreground" : "text-foreground"}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "amber" | "blue" | "emerald" | "red" | "slate";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
      : tone === "red"
        ? "border-destructive/30 bg-destructive/10 text-destructive"
        : tone === "amber"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
          : tone === "blue"
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-border/80 bg-muted/30 text-muted-foreground";

  return (
    <View className={`rounded-full border px-3 py-1 ${toneClass}`}>
      <Text className="text-xs font-semibold uppercase tracking-[1px]">{label}</Text>
    </View>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <View className="items-center gap-4 rounded-[28px] border border-dashed border-border/70 bg-muted/20 px-6 py-8">
      <View className="rounded-[24px] bg-primary/10 px-4 py-4">
        <Icon as={ReceiptText} className="text-primary" size={24} />
      </View>
      <View className="items-center gap-2">
        <Text className="text-lg font-semibold text-foreground">
          {hasFilters ? "No matching invoices found" : "No invoices yet"}
        </Text>
        <Text className="text-center text-sm leading-6 text-muted-foreground">
          {hasFilters
            ? "Try a broader search or reset some filters."
            : "Create your first sales or purchase invoice from the invoice action button."}
        </Text>
      </View>
    </View>
  );
}

function InvoiceActionFab({
  isOpen,
  onCreatePurchase,
  onCreateSales,
  onToggle,
}: {
  isOpen: boolean;
  onCreatePurchase: () => void;
  onCreateSales: () => void;
  onToggle: () => void;
}) {
  return (
    <View className="absolute bottom-28 right-6 items-end gap-3">
      {isOpen ? (
        <>
          <FabAction icon={TrendingDown} label="Purchase invoice" onPress={onCreatePurchase} />
          <FabAction icon={TrendingUp} label="Sales invoice" onPress={onCreateSales} />
        </>
      ) : null}

      <Pressable
        accessibilityLabel={isOpen ? "Close invoice actions" : "Open invoice actions"}
        accessibilityRole="button"
        className="h-16 w-16 items-center justify-center rounded-full bg-primary"
        onPress={onToggle}
        style={{
          shadowColor: "#0f172a",
          shadowOffset: { width: 0, height: 14 },
          shadowOpacity: 0.2,
          shadowRadius: 24,
        }}>
        <Icon as={isOpen ? ChevronUp : Plus} className="text-primary-foreground" size={24} />
      </Pressable>
    </View>
  );
}

function FabAction({
  icon,
  label,
  onPress,
}: {
  icon: typeof TrendingUp;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      className="flex-row items-center gap-3 rounded-full border border-border/70 bg-card px-4 py-3"
      onPress={onPress}
      style={{
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
      }}>
      <View className="rounded-full bg-primary/10 px-2.5 py-2.5">
        <Icon as={icon} className="text-primary" size={18} />
      </View>
      <Text className="font-semibold text-foreground">{label}</Text>
    </Pressable>
  );
}

function formatInvoiceType(type: InvoiceType) {
  if (type === "credit_note") return "Credit note";
  if (type === "debit_note") return "Debit note";
  return type === "sales" ? "Sales" : "Purchase";
}

function formatPaymentStatus(status: PaymentStatus) {
  if (status === "partial") return "Partial";
  if (status === "overdue") return "Overdue";
  return status === "paid" ? "Paid" : "Unpaid";
}

function paymentTone(status: PaymentStatus) {
  if (status === "paid") return "emerald";
  if (status === "overdue") return "red";
  if (status === "partial") return "amber";
  return "slate";
}

function formatInvoicePartyName(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized.toUpperCase() : "PARTY DETAILS UNAVAILABLE";
}
