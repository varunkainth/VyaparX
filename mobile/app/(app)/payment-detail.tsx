import * as React from "react";
import { ActivityIndicator, RefreshControl, ScrollView, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowDownLeft, ArrowUpRight, CreditCard, ShieldCheck, UserRound } from "lucide-react-native";

import { FullScreenLoader } from "@/components/full-screen-loader";
import { SubpageHeader } from "@/components/subpage-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatShortDate } from "@/lib/formatters";
import { paymentService } from "@/services/payment.service";
import { useAuthStore } from "@/store/auth-store";
import type { PaymentWithAllocations } from "@/types/payment";

export default function PaymentDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { session } = useAuthStore();
  const [payment, setPayment] = React.useState<PaymentWithAllocations | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isReconcileOpen, setIsReconcileOpen] = React.useState(false);
  const [bankStatementDate, setBankStatementDate] = React.useState(new Date().toISOString().split("T")[0] ?? "");
  const [bankRefNo, setBankRefNo] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const hasFocusedOnceRef = React.useRef(false);

  const paymentId = typeof params.id === "string" ? params.id : "";

  const loadPayment = React.useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (!session?.business_id || !paymentId) {
      setPayment(null);
      setError("Payment details are unavailable.");
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
      const nextPayment = await paymentService.getPayment(session.business_id, paymentId);
      setPayment(nextPayment);
    } catch (loadError: any) {
      setError(
        loadError?.response?.data?.error?.message ??
          loadError?.response?.data?.message ??
          loadError?.message ??
          "Unable to load payment details.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [paymentId, session?.business_id]);

  React.useEffect(() => {
    void loadPayment();
  }, [loadPayment]);

  useFocusEffect(
    React.useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }

      void loadPayment("refresh");
    }, [loadPayment]),
  );

  async function onReconcile() {
    if (!session?.business_id || !payment) return;

    setIsSubmitting(true);
    try {
      await paymentService.reconcilePayment(session.business_id, payment.id, {
        bank_ref_no: normalizeOptional(bankRefNo),
        bank_statement_date: normalizeOptional(bankStatementDate),
        notes: normalizeOptional(notes),
      });
      setIsReconcileOpen(false);
      await loadPayment();
    } catch (submitError: any) {
      setError(
        submitError?.response?.data?.error?.message ??
          submitError?.response?.data?.message ??
          submitError?.message ??
          "Unable to reconcile this payment.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onUnreconcile() {
    if (!session?.business_id || !payment) return;

    setIsSubmitting(true);
    try {
      await paymentService.unreconcilePayment(session.business_id, payment.id);
      await loadPayment();
    } catch (submitError: any) {
      setError(
        submitError?.response?.data?.error?.message ??
          submitError?.response?.data?.message ??
          submitError?.message ??
          "Unable to unreconcile this payment.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <FullScreenLoader label="Loading payment details" />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-6 pb-28 pt-4"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadPayment("refresh")} />}>
        <View className="gap-6">
          <SubpageHeader
            backHref="/(app)/payments"
            eyebrow="Payment"
            subtitle="Review party, amount, allocation, and reconciliation details for this payment entry."
            title="Payment details"
          />

          {error ? (
            <Card className="rounded-[28px] border-destructive/20 bg-destructive/5">
              <CardContent className="gap-4 px-5 py-5">
                <Text className="font-semibold text-foreground">Payment details unavailable</Text>
                <Text className="text-sm leading-6 text-muted-foreground">{error}</Text>
                <Button className="h-12 rounded-2xl" onPress={() => void loadPayment()}>
                  <Text>Retry</Text>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {payment ? (
            <>
              <Card className="rounded-[28px]">
                <CardHeader>
                  <CardTitle>Payment summary</CardTitle>
                  <CardDescription>Direction, amount, date, and reconciliation state.</CardDescription>
                </CardHeader>
                <CardContent className="gap-3">
                  <Row
                    icon={payment.payment_type === "received" ? ArrowUpRight : ArrowDownLeft}
                    label="Amount"
                    value={formatCurrency(payment.amount)}
                  />
                  <Row icon={CreditCard} label="Mode" value={formatPaymentMode(payment.payment_mode)} />
                  <Row icon={ShieldCheck} label="Status" value={payment.is_reconciled ? "Reconciled" : "Pending reconciliation"} />
                  <Row icon={CreditCard} label="Date" value={formatShortDate(payment.payment_date)} />
                </CardContent>
              </Card>

              <Card className="rounded-[28px]">
                <CardHeader>
                  <CardTitle>Verification</CardTitle>
                  <CardDescription>
                    Review the verification state for this payment and update it if needed.
                  </CardDescription>
                </CardHeader>
                <CardContent className="gap-3">
                  {payment.is_reconciled ? (
                    <Button variant="outline" className="h-14 rounded-[24px]" disabled={isSubmitting} onPress={onUnreconcile}>
                      {isSubmitting ? (
                        <>
                          <ActivityIndicator color="#0f172a" />
                          <Text>Updating...</Text>
                        </>
                      ) : (
                        <Text>Mark as unreconciled</Text>
                      )}
                    </Button>
                  ) : (
                    <Button className="h-14 rounded-[24px]" disabled={isSubmitting} onPress={() => setIsReconcileOpen(true)}>
                      <Text>Reconcile payment</Text>
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-[28px]">
                <CardHeader>
                  <CardTitle>Party details</CardTitle>
                  <CardDescription>Who this payment was recorded against.</CardDescription>
                </CardHeader>
                <CardContent className="gap-3">
                  <Row icon={UserRound} label="Party" value={payment.party_name} />
                  <Row icon={UserRound} label="Type" value={formatPartyType(payment.party_type)} />
                  <Row icon={ShieldCheck} label="Reference" value={payment.bank_ref_no || payment.upi_ref || payment.cheque_no || "Not added"} />
                </CardContent>
              </Card>

              <Card className="rounded-[28px]">
                <CardHeader>
                  <CardTitle>Allocations</CardTitle>
                  <CardDescription>{payment.allocations.length} invoice allocation(s) linked to this payment.</CardDescription>
                </CardHeader>
                <CardContent className="gap-3">
                  {payment.allocations.length ? (
                    payment.allocations.map((allocation) => (
                      <View key={allocation.id} className="rounded-[24px] border border-border/70 bg-background px-4 py-4">
                        <View className="flex-row items-center justify-between gap-4">
                          <View className="flex-1 gap-1">
                            <Text className="font-semibold text-foreground">{allocation.invoice_number}</Text>
                            <Text className="text-sm leading-5 text-muted-foreground">Allocated on {formatShortDate(allocation.created_at)}</Text>
                          </View>
                          <Text className="font-semibold text-foreground">{formatCurrency(allocation.allocated_amount)}</Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <View className="rounded-[24px] border border-dashed border-border/70 bg-muted/20 px-4 py-6">
                      <Text className="text-center text-sm leading-6 text-muted-foreground">
                        No invoice allocations were attached to this payment entry.
                      </Text>
                    </View>
                  )}
                </CardContent>
              </Card>

              {payment.notes ? (
                <Card className="rounded-[28px]">
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                    <CardDescription>Extra context recorded with this payment.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Text className="text-sm leading-6 text-muted-foreground">{payment.notes}</Text>
                  </CardContent>
                </Card>
              ) : null}
            </>
          ) : null}
        </View>
      </ScrollView>
      <Dialog open={isReconcileOpen} onOpenChange={setIsReconcileOpen}>
        <DialogContent className="max-w-[420px] rounded-[28px]">
          <DialogHeader>
            <DialogTitle>Reconcile payment</DialogTitle>
            <DialogDescription>Add verification details before marking this payment as reconciled.</DialogDescription>
          </DialogHeader>
          <View className="gap-4">
            <Input value={bankStatementDate} onChangeText={setBankStatementDate} placeholder="Statement date YYYY-MM-DD" />
            <Input value={bankRefNo} onChangeText={setBankRefNo} placeholder="Bank reference number" />
            <Textarea
              className="min-h-[100px] rounded-[22px] border-border/70 bg-muted/35 px-4 py-3"
              placeholder="Optional verification notes"
              value={notes}
              onChangeText={setNotes}
            />
            <Button className="h-14 rounded-[24px]" disabled={isSubmitting} onPress={onReconcile}>
              {isSubmitting ? (
                <>
                  <ActivityIndicator color="#ffffff" />
                  <Text>Reconciling...</Text>
                </>
              ) : (
                <Text>Confirm reconcile</Text>
              )}
            </Button>
          </View>
        </DialogContent>
      </Dialog>
    </SafeAreaView>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: typeof CreditCard;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-border/70 bg-background px-4 py-4">
      <View className="rounded-2xl bg-primary/10 px-3 py-3">
        <Icon as={icon} className="text-primary" size={18} />
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-sm text-muted-foreground">{label}</Text>
        <Text className="font-semibold text-foreground">{value}</Text>
      </View>
    </View>
  );
}

function formatPaymentMode(mode: PaymentWithAllocations["payment_mode"]) {
  if (mode === "bank_transfer") return "Bank transfer";
  return mode === "upi" ? "UPI" : mode.charAt(0).toUpperCase() + mode.slice(1);
}

function formatPartyType(type: PaymentWithAllocations["party_type"]) {
  if (type === "both") return "Customer and supplier";
  return type === "customer" ? "Customer" : "Supplier";
}

function normalizeOptional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
