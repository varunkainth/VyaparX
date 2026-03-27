import * as React from "react";
import { Pressable, RefreshControl, ScrollView, Switch, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronUp,
  CircleDollarSign,
  CreditCard,
  Plus,
  Search,
  ShieldCheck,
  Wallet,
} from "lucide-react-native";

import { CollectionScreenSkeleton } from "@/components/screen-skeleton";
import { SubpageHeader } from "@/components/subpage-header";
import { ToastBanner, useTimedToast } from "@/components/ui/toast-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DevCacheIndicator } from "@/components/dev-cache-indicator";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { CACHE_TTL_MS, formatCacheAge, isCacheStale } from "@/lib/cache-policy";
import { formatCompactNumber, formatCurrency, formatShortDate } from "@/lib/formatters";
import { useAuthStore } from "@/store/auth-store";
import { getPaymentCacheKey, usePaymentStore } from "@/store/payment-store";
import type { Payment, PaymentType } from "@/types/payment";

const PAYMENT_TYPE_FILTERS: Array<{ label: string; value: PaymentType | "all" }> = [
  { label: "All", value: "all" },
  { label: "Received", value: "received" },
  { label: "Made", value: "made" },
];

export default function PaymentsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ refresh?: string; toast?: string }>();
  const { session } = useAuthStore();
  const ensurePayments = usePaymentStore((state) => state.ensurePayments);
  const { message, showToast } = useTimedToast();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [paymentTypeFilter, setPaymentTypeFilter] = React.useState<PaymentType | "all">("all");
  const [onlyUnreconciled, setOnlyUnreconciled] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isFabOpen, setIsFabOpen] = React.useState(false);
  const handledRefreshRef = React.useRef<string | null>(null);
  const handledToastRef = React.useRef<string | null>(null);
  const hasFocusedOnceRef = React.useRef(false);
  const paymentCache = usePaymentStore((state) =>
    session?.business_id ? state.cache[getPaymentCacheKey(session.business_id, onlyUnreconciled)] : undefined
  );
  const payments = paymentCache?.items ?? [];
  const cacheError = paymentCache?.error ?? null;
  const paymentCacheState =
    paymentCache?.status === "loading"
      ? "refreshing"
      : payments.length
        ? isCacheStale(paymentCache?.updatedAt, CACHE_TTL_MS.paymentList)
          ? "stale"
          : "cached"
        : "empty";

  const loadPayments = React.useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!session?.business_id) {
        setError("Select a business to view payments.");
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
        await ensurePayments(session.business_id, onlyUnreconciled, mode === "refresh");
      } catch (loadError: any) {
        setError(
          loadError?.response?.data?.error?.message ??
            loadError?.response?.data?.message ??
            loadError?.message ??
            "Unable to load payments.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [ensurePayments, onlyUnreconciled, session?.business_id],
  );

  React.useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  useFocusEffect(
    React.useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }

      void loadPayments("refresh");
    }, [loadPayments]),
  );

  React.useEffect(() => {
    if (!params.toast || params.toast === handledToastRef.current) return;
    handledToastRef.current = params.toast;
    showToast(params.toast);
  }, [params.toast, showToast]);

  React.useEffect(() => {
    if (!params.refresh || params.refresh === handledRefreshRef.current) return;
    handledRefreshRef.current = params.refresh;
    void loadPayments("refresh");
  }, [loadPayments, params.refresh]);

  const filteredPayments = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return payments.filter((payment) => {
      if (paymentTypeFilter !== "all" && payment.payment_type !== paymentTypeFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        payment.party_name.toLowerCase().includes(query) ||
        payment.payment_mode.toLowerCase().includes(query) ||
        payment.notes?.toLowerCase().includes(query)
      );
    });
  }, [paymentTypeFilter, payments, searchQuery]);

  const stats = React.useMemo(() => {
    return {
      total: payments.length,
      received: payments
        .filter((payment) => payment.payment_type === "received")
        .reduce((sum, payment) => sum + payment.amount, 0),
      made: payments
        .filter((payment) => payment.payment_type === "made")
        .reduce((sum, payment) => sum + payment.amount, 0),
      unreconciled: payments.filter((payment) => !payment.is_reconciled).length,
    };
  }, [payments]);

  if (isLoading) {
    return <CollectionScreenSkeleton metricCount={4} rowCount={5} />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-6 pb-28 pt-4"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadPayments("refresh")} />}>
        <View className="gap-6">
          <SubpageHeader
            backHref="/(app)/invoices"
            eyebrow="Payments"
            subtitle="Review money received and paid against billing activity for the active business."
            title="Collections desk"
          />
          <DevCacheIndicator
            label="payments"
            state={paymentCacheState}
            detail={formatCacheAge(paymentCache?.updatedAt)}
          />

          <View className="flex-row flex-wrap gap-4">
            <MiniPill icon={Wallet} label={`${stats.total} payment entries`} />
            <MiniPill icon={ArrowUpRight} label={`${formatCompactNumber(stats.received)} received`} />
            <MiniPill icon={ArrowDownLeft} label={`${formatCompactNumber(stats.made)} made`} />
            <MiniPill icon={ShieldCheck} label={`${stats.unreconciled} unreconciled`} />
          </View>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Search by party or mode, then focus the list by payment type and reconciliation state.</CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              <View className="relative">
                <View className="absolute left-4 top-3.5 z-10">
                  <Icon as={Search} className="text-muted-foreground" size={18} />
                </View>
                <Input
                  className="pl-11"
                  placeholder="Search by party, mode, or notes"
                  returnKeyType="search"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <View className="gap-2">
                <Text className="font-medium text-foreground">Payment type</Text>
                <View className="flex-row flex-wrap gap-3">
                  {PAYMENT_TYPE_FILTERS.map((option) => {
                    const selected = option.value === paymentTypeFilter;
                    return (
                      <Pressable
                        key={option.value}
                        className={`rounded-[22px] border px-4 py-3 ${
                          selected ? "border-primary bg-primary" : "border-border/70 bg-background"
                        }`}
                        onPress={() => setPaymentTypeFilter(option.value)}>
                        <Text className={selected ? "text-primary-foreground" : "text-foreground"}>{option.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View className="flex-row items-center gap-4 rounded-2xl border border-border/70 bg-background px-4 py-4">
                <View className="flex-1 gap-1">
                  <Text className="font-medium text-foreground">Only unreconciled</Text>
                  <Text className="text-sm leading-5 text-muted-foreground">
                    Show only payment entries that still need bank verification or reconciliation.
                  </Text>
                </View>
                <Switch onValueChange={setOnlyUnreconciled} value={onlyUnreconciled} />
              </View>
            </CardContent>
          </Card>

          {error || cacheError ? (
            <Card className="rounded-[28px] border-destructive/20 bg-destructive/5">
              <CardContent className="gap-4 px-5 py-5">
                <Text className="font-semibold text-foreground">Payment sync failed</Text>
                <Text className="text-sm leading-6 text-muted-foreground">{error ?? cacheError}</Text>
                <Button className="h-12 rounded-2xl" onPress={() => void loadPayments()}>
                  <Text>Retry payment sync</Text>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Recent payments</CardTitle>
              <CardDescription>
                {filteredPayments.length} results shown {searchQuery ? `for "${searchQuery.trim()}"` : "for this business"}.
              </CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              {filteredPayments.length ? (
                filteredPayments.map((payment) => (
                  <Pressable
                    key={payment.id}
                    className="rounded-[24px] border border-border/70 bg-background px-4 py-4"
                    onPress={() =>
                      router.push({ pathname: "/(app)/payment-detail", params: { id: payment.id } })
                    }>
                    <View className="flex-row items-start gap-4">
                      <View className="rounded-2xl bg-primary/10 px-3 py-3">
                        <Icon
                          as={payment.payment_type === "received" ? ArrowUpRight : ArrowDownLeft}
                          className="text-primary"
                          size={18}
                        />
                      </View>
                      <View className="flex-1 gap-3">
                        <View className="flex-row items-start justify-between gap-4">
                          <View className="flex-1 gap-1">
                            <Text className="font-semibold text-foreground">{payment.party_name}</Text>
                            <Text className="text-sm leading-5 text-muted-foreground">
                              {formatPaymentMode(payment.payment_mode)}
                            </Text>
                          </View>
                          <Text className="text-sm font-semibold text-foreground">{formatCurrency(payment.amount)}</Text>
                        </View>

                        <View className="flex-row flex-wrap gap-2">
                          <StatusBadge
                            label={payment.payment_type === "received" ? "Received" : "Made"}
                            tone={payment.payment_type === "received" ? "emerald" : "amber"}
                          />
                          <StatusBadge
                            label={payment.is_reconciled ? "Reconciled" : "Pending reconciliation"}
                            tone={payment.is_reconciled ? "blue" : "red"}
                          />
                        </View>

                        <Text className="text-xs uppercase tracking-[1px] text-muted-foreground">
                          {formatShortDate(payment.payment_date)}
                          {payment.bank_ref_no ? ` | Ref ${payment.bank_ref_no}` : ""}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))
              ) : (
                <EmptyState hasFilters={Boolean(searchQuery.trim()) || paymentTypeFilter !== "all" || onlyUnreconciled} />
              )}
            </CardContent>
          </Card>
        </View>
      </ScrollView>
      <PaymentActionFab
        isOpen={isFabOpen}
        onRecord={() => {
          setIsFabOpen(false);
          router.push("/(app)/payment-record");
        }}
        onToggle={() => setIsFabOpen((current) => !current)}
      />
      <ToastBanner message={message} variant="success" />
    </SafeAreaView>
  );
}

function MiniPill({ icon, label }: { icon: typeof Wallet; label: string }) {
  return (
    <View className="min-w-[140px] flex-1 flex-row items-center gap-3 rounded-2xl border border-border/70 bg-background px-4 py-4">
      <View className="rounded-2xl bg-primary/10 px-3 py-3">
        <Icon as={icon} className="text-primary" size={18} />
      </View>
      <Text className="flex-1 font-medium text-foreground">{label}</Text>
    </View>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "amber" | "blue" | "emerald" | "red";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
      : tone === "red"
        ? "border-destructive/30 bg-destructive/10 text-destructive"
        : tone === "amber"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
          : "border-primary/30 bg-primary/10 text-primary";

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
        <Icon as={CreditCard} className="text-primary" size={24} />
      </View>
      <View className="items-center gap-2">
        <Text className="text-lg font-semibold text-foreground">
          {hasFilters ? "No matching payments found" : "No payments yet"}
        </Text>
        <Text className="text-center text-sm leading-6 text-muted-foreground">
          {hasFilters
            ? "Try a broader search or disable some payment filters."
            : "Payment entries will appear here once billing collections or payouts are recorded."}
        </Text>
      </View>
    </View>
  );
}

function PaymentActionFab({
  isOpen,
  onRecord,
  onToggle,
}: {
  isOpen: boolean;
  onRecord: () => void;
  onToggle: () => void;
}) {
  return (
    <View className="absolute bottom-28 right-6 items-end gap-3">
      {isOpen ? <FabAction icon={CircleDollarSign} label="Record payment" onPress={onRecord} /> : null}

      <Pressable
        accessibilityLabel={isOpen ? "Close payment actions" : "Open payment actions"}
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
  icon: typeof CircleDollarSign;
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

function formatPaymentMode(mode: Payment["payment_mode"]) {
  if (mode === "bank_transfer") return "Bank transfer";
  return mode === "upi" ? "UPI" : mode.charAt(0).toUpperCase() + mode.slice(1);
}
