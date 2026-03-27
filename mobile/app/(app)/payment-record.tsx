import * as React from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  Landmark,
  Search,
  UserRound,
} from "lucide-react-native";

import { FormScreenSkeleton } from "@/components/screen-skeleton";
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
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { invoiceService } from "@/services/invoice.service";
import { partyService } from "@/services/party.service";
import { paymentService } from "@/services/payment.service";
import { useAuthStore } from "@/store/auth-store";
import type { Invoice } from "@/types/invoice";
import { PAYMENT_MODES, type PaymentMode, type PaymentType } from "@/types/payment";
import type { Party } from "@/types/party";
import { formatCurrency, formatShortDate } from "@/lib/formatters";

type PaymentForm = {
  amount: string;
  bank_ref_no: string;
  cheque_date: string;
  cheque_no: string;
  notes: string;
  party_id: string;
  payment_date: string;
  payment_mode: PaymentMode;
  payment_type: PaymentType;
  upi_ref: string;
  use_manual_payment: boolean;
};

const INITIAL_FORM: PaymentForm = {
  amount: "",
  bank_ref_no: "",
  cheque_date: "",
  cheque_no: "",
  notes: "",
  party_id: "",
  payment_date: new Date().toISOString().split("T")[0] ?? "",
  payment_mode: "cash",
  payment_type: "received",
  upi_ref: "",
  use_manual_payment: false,
};

export default function PaymentRecordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ invoice_id?: string }>();
  const { session } = useAuthStore();
  const [parties, setParties] = React.useState<Party[]>([]);
  const [availableInvoices, setAvailableInvoices] = React.useState<Invoice[]>([]);
  const [invoice, setInvoice] = React.useState<Invoice | null>(null);
  const [form, setForm] = React.useState<PaymentForm>(INITIAL_FORM);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = React.useState<string[]>([]);
  const [allocationDrafts, setAllocationDrafts] = React.useState<Record<string, string>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isInvoicePickerOpen, setIsInvoicePickerOpen] = React.useState(false);
  const [isPartyPickerOpen, setIsPartyPickerOpen] = React.useState(false);
  const [partySearch, setPartySearch] = React.useState("");
  const [invoiceSearch, setInvoiceSearch] = React.useState("");

  const invoiceId = typeof params.invoice_id === "string" ? params.invoice_id : "";

  const loadBaseData = React.useCallback(async () => {
    if (!session?.business_id) {
      setError("No active business found for payment recording.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      setError(null);
      const [nextParties, nextInvoice] = await Promise.all([
        partyService.listParties(session.business_id, {
          include_inactive: "false",
        }),
        invoiceId ? invoiceService.getInvoice(session.business_id, invoiceId) : Promise.resolve(null),
      ]);
      setParties(nextParties);

      if (nextInvoice) {
        setInvoice(nextInvoice);
        setSelectedInvoiceIds([nextInvoice.id]);
        setAllocationDrafts({ [nextInvoice.id]: String(nextInvoice.balance_due) });
        setForm({
          ...INITIAL_FORM,
          amount: String(nextInvoice.balance_due),
          notes: `Payment for invoice ${nextInvoice.invoice_number}`,
          party_id: nextInvoice.party_id,
          payment_type: nextInvoice.invoice_type === "sales" ? "received" : "made",
          payment_date: INITIAL_FORM.payment_date,
          use_manual_payment: false,
        });
      }
    } catch (loadError: any) {
      setError(
        loadError?.response?.data?.error?.message ??
          loadError?.response?.data?.message ??
          loadError?.message ??
          "Unable to load payment form data.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId, session?.business_id]);

  React.useEffect(() => {
    void loadBaseData();
  }, [loadBaseData]);

  const loadAvailableInvoices = React.useCallback(
    async (partyId: string, paymentType: PaymentType) => {
      if (!session?.business_id || !partyId) {
        setAvailableInvoices([]);
        return;
      }

      try {
        const response = await invoiceService.listInvoices(session.business_id, {
          invoice_type: paymentType === "received" ? "sales" : "purchase",
          limit: 100,
          party_id: partyId,
        });
        setAvailableInvoices(
          response.items.filter(
            (entry) => entry.payment_status === "unpaid" || entry.payment_status === "partial",
          ),
        );
      } catch {
        setAvailableInvoices([]);
      }
    },
    [session?.business_id],
  );

  React.useEffect(() => {
    if (invoice) return;
    if (!form.party_id) {
      setAvailableInvoices([]);
      setSelectedInvoiceIds([]);
      setAllocationDrafts({});
      return;
    }
    void loadAvailableInvoices(form.party_id, form.payment_type);
  }, [form.party_id, form.payment_type, invoice, loadAvailableInvoices]);

  const selectedParty = React.useMemo(
    () => parties.find((party) => party.id === form.party_id) ?? null,
    [form.party_id, parties],
  );
  const selectedInvoices = React.useMemo(() => {
    const sourceInvoices = invoice ? [invoice] : availableInvoices;
    return sourceInvoices.filter((entry) => selectedInvoiceIds.includes(entry.id));
  }, [availableInvoices, invoice, selectedInvoiceIds]);

  const filteredParties = React.useMemo(() => {
    const query = partySearch.trim().toLowerCase();
    const visibleParties = parties.filter((party) =>
      form.payment_type === "received"
        ? party.party_type === "customer" || party.party_type === "both"
        : party.party_type === "supplier" || party.party_type === "both",
    );
    if (!query) return visibleParties;
    return visibleParties.filter((party) => {
      return (
        party.name.toLowerCase().includes(query) ||
        party.phone?.toLowerCase().includes(query) ||
        party.email?.toLowerCase().includes(query)
      );
    });
  }, [form.payment_type, parties, partySearch]);

  const filteredInvoices = React.useMemo(() => {
    const query = invoiceSearch.trim().toLowerCase();
    if (!query) return availableInvoices;
    return availableInvoices.filter((entry) => {
      return (
        entry.invoice_number.toLowerCase().includes(query) ||
        entry.party_name.toLowerCase().includes(query)
      );
    });
  }, [availableInvoices, invoiceSearch]);

  const selectedInvoiceSummary = React.useMemo(() => {
    if (form.use_manual_payment) {
      return "Manual payment without invoice allocation";
    }

    if (!selectedInvoices.length) {
      return "Choose invoices";
    }

    if (selectedInvoices.length === 1) {
      return selectedInvoices[0]?.invoice_number ?? "Choose invoices";
    }

    return `${selectedInvoices.length} invoices selected`;
  }, [form.use_manual_payment, selectedInvoices]);

  React.useEffect(() => {
    if (invoice || form.use_manual_payment) {
      return;
    }

    setSelectedInvoiceIds((current) =>
      current.filter((invoiceEntryId) => availableInvoices.some((entry) => entry.id === invoiceEntryId)),
    );
    setAllocationDrafts((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([invoiceEntryId]) =>
          availableInvoices.some((entry) => entry.id === invoiceEntryId),
        ),
      ),
    );
  }, [availableInvoices, form.use_manual_payment, invoice]);

  React.useEffect(() => {
    if (form.use_manual_payment) {
      return;
    }

    const totalAllocated = selectedInvoices.reduce((sum, selectedEntry) => {
      return sum + getAllocationValue(allocationDrafts[selectedEntry.id]);
    }, 0);

    setForm((current) => {
      const nextAmount = totalAllocated > 0 ? String(round2(totalAllocated)) : "";
      if (current.amount === nextAmount) {
        return current;
      }

      return {
        ...current,
        amount: nextAmount,
      };
    });
  }, [allocationDrafts, form.use_manual_payment, selectedInvoices]);

  function updateForm<Key extends keyof PaymentForm>(field: Key, value: PaymentForm[Key]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function selectParty(party: Party) {
    setForm((current) => ({
      ...current,
      amount: "",
      notes: "",
      party_id: party.id,
    }));
    setSelectedInvoiceIds([]);
    setAllocationDrafts({});
    setIsPartyPickerOpen(false);
  }

  function toggleInvoice(nextInvoice: Invoice) {
    setSelectedInvoiceIds((current) => {
      if (current.includes(nextInvoice.id)) {
        return current.filter((invoiceEntryId) => invoiceEntryId !== nextInvoice.id);
      }

      return [...current, nextInvoice.id];
    });
    setAllocationDrafts((current) => {
      if (current[nextInvoice.id] != null) {
        const nextDrafts = { ...current };
        delete nextDrafts[nextInvoice.id];
        return nextDrafts;
      }

      return {
        ...current,
        [nextInvoice.id]: String(nextInvoice.balance_due),
      };
    });
    setForm((current) => ({
      ...current,
      notes: current.notes || `Payment for invoice ${nextInvoice.invoice_number}`,
    }));
    setIsInvoicePickerOpen(false);
  }

  function updateAllocation(invoiceEntryId: string, value: string) {
    setAllocationDrafts((current) => ({
      ...current,
      [invoiceEntryId]: sanitizeDecimal(value),
    }));
  }

  function removeAllocation(invoiceEntryId: string) {
    setSelectedInvoiceIds((current) => current.filter((entryId) => entryId !== invoiceEntryId));
    setAllocationDrafts((current) => {
      const nextDrafts = { ...current };
      delete nextDrafts[invoiceEntryId];
      return nextDrafts;
    });
  }

  async function onSubmit() {
    if (!session?.business_id) {
      setError("No active business found for payment recording.");
      return;
    }

    if (!form.party_id) {
      setError("Choose a party first.");
      return;
    }

    if (!form.use_manual_payment && !selectedInvoiceIds.length) {
      setError("Select at least one invoice to allocate this payment.");
      return;
    }

    const amount = Number(form.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }

    if (form.payment_mode === "upi" && !form.upi_ref.trim()) {
      setError("UPI reference is required for UPI payments.");
      return;
    }

    if (form.payment_mode === "cheque" && !form.cheque_no.trim()) {
      setError("Cheque number is required for cheque payments.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const allocations = form.use_manual_payment
        ? []
        : selectedInvoices
            .map((selectedEntry) => ({
              allocated_amount: round2(getAllocationValue(allocationDrafts[selectedEntry.id])),
              invoice_id: selectedEntry.id,
            }))
            .filter((allocation) => allocation.allocated_amount > 0);

      if (!form.use_manual_payment && allocations.length === 0) {
        setError("Enter an allocation amount for at least one invoice.");
        setIsSubmitting(false);
        return;
      }

      for (const selectedEntry of selectedInvoices) {
        const allocatedAmount =
          allocations.find((allocation) => allocation.invoice_id === selectedEntry.id)?.allocated_amount ?? 0;

        if (allocatedAmount > selectedEntry.balance_due) {
          setError(`Allocation cannot exceed balance due for ${selectedEntry.invoice_number}.`);
          setIsSubmitting(false);
          return;
        }
      }

      await paymentService.recordPayment({
        allocations,
        amount,
        bank_ref_no: normalizeOptional(form.bank_ref_no),
        cheque_date: normalizeOptional(form.cheque_date),
        cheque_no: normalizeOptional(form.cheque_no),
        notes: normalizeOptional(form.notes),
        party_id: form.party_id,
        payment_date: form.payment_date,
        payment_mode: form.payment_mode,
        payment_type: form.payment_type,
        upi_ref: normalizeOptional(form.upi_ref),
      });

      router.replace({
        pathname: "/(app)/payments",
        params: {
          refresh: String(Date.now()),
          toast: "Payment recorded successfully.",
        },
      });
    } catch (submitError: any) {
      setError(
        submitError?.response?.data?.error?.message ??
          submitError?.response?.data?.message ??
          submitError?.message ??
          "Unable to record the payment.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <FormScreenSkeleton rowCount={4} showActionCard />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-6 pb-28 pt-4">
        <View className="gap-6">
          <SubpageHeader
            backHref="/(app)/payments"
            eyebrow="Payments"
            subtitle="Record a payment and allocate it across one or more outstanding invoices."
            title="Record payment"
          />

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Payment details</CardTitle>
              <CardDescription>Choose payment direction, party, invoice, amount, and mode.</CardDescription>
            </CardHeader>
            <CardContent className="gap-5">
              <Field label="Payment type" required>
                <View className="flex-row gap-3">
                  <PaymentTypeChip
                    icon={ArrowUpRight}
                    label="Received"
                    selected={form.payment_type === "received"}
                    onPress={() => {
                      if (invoice) return;
                      setSelectedInvoiceIds([]);
                      setAllocationDrafts({});
                      updateForm("payment_type", "received");
                    }}
                  />
                  <PaymentTypeChip
                    icon={ArrowDownLeft}
                    label="Made"
                    selected={form.payment_type === "made"}
                    onPress={() => {
                      if (invoice) return;
                      setSelectedInvoiceIds([]);
                      setAllocationDrafts({});
                      updateForm("payment_type", "made");
                    }}
                  />
                </View>
              </Field>

              <Field label="Party" required>
                <SelectionCard
                  disabled={Boolean(invoice)}
                  icon={UserRound}
                  label={form.payment_type === "received" ? "Customer" : "Supplier"}
                  onPress={() => setIsPartyPickerOpen(true)}
                  value={selectedParty ? selectedParty.name : "Choose party"}
                />
              </Field>

              <Field label={form.use_manual_payment ? "Invoice allocation" : "Invoices"} required={!form.use_manual_payment}>
                <SelectionCard
                  disabled={Boolean(invoice) || form.use_manual_payment}
                  icon={CircleDollarSign}
                  label="Allocate payment"
                  onPress={() => setIsInvoicePickerOpen(true)}
                  value={selectedInvoiceSummary}
                />
              </Field>

              {!invoice ? (
                <Field label="Payment mode setup">
                  <View className="flex-row gap-3">
                    <ModeChip
                      label="Allocated"
                      selected={!form.use_manual_payment}
                      onPress={() => updateForm("use_manual_payment", false)}
                    />
                    <ModeChip
                      label="Manual"
                      selected={form.use_manual_payment}
                      onPress={() => {
                        setSelectedInvoiceIds([]);
                        setAllocationDrafts({});
                        updateForm("use_manual_payment", true);
                        updateForm("amount", "");
                      }}
                    />
                  </View>
                </Field>
              ) : null}

              {selectedInvoices.length && !form.use_manual_payment ? (
                <View className="gap-3">
                  {selectedInvoices.map((selectedEntry) => (
                    <View key={selectedEntry.id} className="rounded-[24px] border border-primary/20 bg-primary/5 px-4 py-4">
                      <View className="flex-row items-start justify-between gap-4">
                        <View className="flex-1 gap-1">
                          <Text className="font-semibold text-foreground">{selectedEntry.invoice_number}</Text>
                          <Text className="text-sm text-muted-foreground">
                            {selectedEntry.party_name} | Due {formatCurrency(selectedEntry.balance_due)}
                          </Text>
                        </View>
                        {!invoice ? (
                          <Pressable
                            className="rounded-full border border-border/70 bg-background px-3 py-2"
                            onPress={() => removeAllocation(selectedEntry.id)}>
                            <Text className="text-xs font-semibold text-foreground">Remove</Text>
                          </Pressable>
                        ) : null}
                      </View>
                      <Text className="mt-3 text-sm text-muted-foreground">
                        Invoice date {formatShortDate(selectedEntry.invoice_date)}
                      </Text>
                      <View className="mt-4 gap-2">
                        <Text className="font-medium text-foreground">Allocated amount</Text>
                        <Input
                          keyboardType="decimal-pad"
                          value={allocationDrafts[selectedEntry.id] ?? ""}
                          onChangeText={(value) => updateAllocation(selectedEntry.id, value)}
                          placeholder="0"
                        />
                      </View>
                      <View className="mt-3 flex-row flex-wrap gap-3">
                        <QuickAmountChip
                          label="50%"
                          onPress={() => updateAllocation(selectedEntry.id, String(round2(selectedEntry.balance_due * 0.5)))}
                        />
                        <QuickAmountChip
                          label="Max"
                          onPress={() => updateAllocation(selectedEntry.id, String(selectedEntry.balance_due))}
                        />
                        <QuickAmountChip label="Clear" onPress={() => updateAllocation(selectedEntry.id, "")} />
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}

              {selectedInvoices.length && !form.use_manual_payment ? (
                <View className="gap-2">
                  <Text className="font-medium text-foreground">Allocation summary</Text>
                  <View className="rounded-[24px] border border-border/70 bg-muted/20 px-4 py-4">
                    <Text className="text-sm text-muted-foreground">Invoices selected</Text>
                    <Text className="mt-1 text-xl font-bold text-foreground">{selectedInvoices.length}</Text>
                    <Text className="mt-3 text-sm text-muted-foreground">Allocated total</Text>
                    <Text className="mt-1 text-xl font-bold text-foreground">
                      {formatCurrency(Number(form.amount || 0))}
                    </Text>
                  </View>
                </View>
              ) : null}

              <View className="flex-row gap-4">
                <Field className="flex-1" label="Amount" required>
                  <Input
                    keyboardType="decimal-pad"
                    editable={form.use_manual_payment}
                    value={form.amount}
                    onChangeText={(value) => updateForm("amount", sanitizeDecimal(value))}
                    placeholder="0"
                  />
                </Field>
                <Field className="flex-1" label="Payment date" required>
                  <Input value={form.payment_date} onChangeText={(value) => updateForm("payment_date", value)} placeholder="YYYY-MM-DD" />
                </Field>
              </View>

              {!form.use_manual_payment ? (
                <Text className="text-sm leading-6 text-muted-foreground">
                  Total amount is calculated from your invoice allocations.
                </Text>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Payment mode</CardTitle>
              <CardDescription>Choose how the payment was made and add any reference details.</CardDescription>
            </CardHeader>
            <CardContent className="gap-5">
              <View className="flex-row flex-wrap gap-3">
                {PAYMENT_MODES.map((mode) => (
                  <ModeChip
                    key={mode.value}
                    label={mode.label}
                    selected={form.payment_mode === mode.value}
                    onPress={() => updateForm("payment_mode", mode.value)}
                  />
                ))}
              </View>

              {form.payment_mode === "upi" ? (
                <Field label="UPI reference" required>
                  <Input value={form.upi_ref} onChangeText={(value) => updateForm("upi_ref", value)} placeholder="Transaction reference" />
                </Field>
              ) : null}

              {form.payment_mode === "cheque" ? (
                <View className="flex-row gap-4">
                  <Field className="flex-1" label="Cheque number" required>
                    <Input value={form.cheque_no} onChangeText={(value) => updateForm("cheque_no", value)} />
                  </Field>
                  <Field className="flex-1" label="Cheque date">
                    <Input value={form.cheque_date} onChangeText={(value) => updateForm("cheque_date", value)} placeholder="YYYY-MM-DD" />
                  </Field>
                </View>
              ) : null}

              {form.payment_mode === "bank_transfer" ? (
                <Field label="Bank reference">
                  <Input value={form.bank_ref_no} onChangeText={(value) => updateForm("bank_ref_no", value)} placeholder="Reference number" />
                </Field>
              ) : null}

              <View className="rounded-[24px] border border-emerald-500/20 bg-emerald-500/10 px-4 py-4">
                <Text className="font-semibold text-foreground">Auto-reconciled</Text>
                <Text className="mt-1 text-sm leading-6 text-muted-foreground">
                  Payments are marked reconciled when recorded. Add UPI, cheque, or bank references when available for cleaner audit history.
                </Text>
              </View>
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <CardDescription>Optional payment notes or reconciliation context.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                className="min-h-[110px] rounded-[22px] border-border/70 bg-muted/35 px-4 py-3"
                value={form.notes}
                onChangeText={(value) => updateForm("notes", value)}
                placeholder="Optional notes"
              />
            </CardContent>
          </Card>

          {error ? (
            <View className="rounded-[24px] border border-destructive/30 bg-destructive/10 px-4 py-4">
              <Text className="text-sm text-destructive">{error}</Text>
            </View>
          ) : null}

          <Button className="mb-4 h-14 rounded-[24px]" disabled={isSubmitting} onPress={onSubmit}>
            {isSubmitting ? (
              <>
                <ActivityIndicator color="#ffffff" />
                <Text className="text-base">Recording payment...</Text>
              </>
            ) : (
              <>
                <Icon as={CreditCard} className="text-primary-foreground" size={18} />
                <Text className="text-base">Record payment</Text>
              </>
            )}
          </Button>
        </View>
      </ScrollView>

      <Dialog open={isPartyPickerOpen} onOpenChange={setIsPartyPickerOpen}>
        <DialogContent className="max-w-[420px] rounded-[28px]">
          <DialogHeader>
            <DialogTitle>Choose party</DialogTitle>
            <DialogDescription>Pick the customer or supplier this payment belongs to.</DialogDescription>
          </DialogHeader>
          <View className="gap-4">
            <PickerSearch value={partySearch} onChangeText={setPartySearch} placeholder="Search parties" />
            <ScrollView className="max-h-[360px]">
              <View className="gap-3">
                {filteredParties.map((party) => (
                  <Pressable
                    key={party.id}
                    className={`rounded-[22px] border px-4 py-4 ${form.party_id === party.id ? "border-primary bg-primary/10" : "border-border/70 bg-background"}`}
                    onPress={() => selectParty(party)}>
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

      <Dialog open={isInvoicePickerOpen} onOpenChange={setIsInvoicePickerOpen}>
        <DialogContent className="max-w-[420px] rounded-[28px]">
          <DialogHeader>
            <DialogTitle>Choose invoice</DialogTitle>
            <DialogDescription>Select one or more unpaid or partially paid invoices for this payment allocation.</DialogDescription>
          </DialogHeader>
          <View className="gap-4">
            <PickerSearch value={invoiceSearch} onChangeText={setInvoiceSearch} placeholder="Search invoices" />
            <ScrollView className="max-h-[360px]">
              <View className="gap-3">
                {filteredInvoices.length ? (
                  filteredInvoices.map((entry) => (
                    <Pressable
                      key={entry.id}
                      className={`rounded-[22px] border px-4 py-4 ${selectedInvoiceIds.includes(entry.id) ? "border-primary bg-primary/10" : "border-border/70 bg-background"}`}
                      onPress={() => toggleInvoice(entry)}>
                      <View className="flex-row items-start justify-between gap-4">
                        <View className="flex-1 gap-1">
                          <Text className="font-semibold text-foreground">{entry.invoice_number}</Text>
                          <Text className="text-sm text-muted-foreground">{entry.party_name}</Text>
                        </View>
                        <View className="items-end gap-2">
                          <Text className="font-semibold text-foreground">{formatCurrency(entry.balance_due)}</Text>
                          <Text className="text-xs font-semibold uppercase tracking-[1px] text-muted-foreground">
                            {selectedInvoiceIds.includes(entry.id) ? "Selected" : "Tap to add"}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  ))
                ) : (
                  <View className="rounded-[22px] border border-dashed border-border/70 bg-muted/20 px-4 py-6">
                    <Text className="text-center text-sm leading-6 text-muted-foreground">
                      No unpaid invoices matched the current selection.
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </DialogContent>
      </Dialog>
    </SafeAreaView>
  );
}

function Field({
  children,
  className,
  label,
  required,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <View className={className}>
      <View className="gap-2">
        <Label>
          {label}
          {required ? <Text className="text-destructive"> *</Text> : null}
        </Label>
        {children}
      </View>
    </View>
  );
}

function SelectionCard({
  disabled,
  icon,
  label,
  onPress,
  value,
}: {
  disabled?: boolean;
  icon: typeof UserRound;
  label: string;
  onPress: () => void;
  value: string;
}) {
  return (
    <Pressable
      className={`flex-row items-center gap-4 rounded-[24px] border px-4 py-4 ${disabled ? "border-border/60 bg-muted/30 opacity-70" : "border-border/70 bg-background"}`}
      disabled={disabled}
      onPress={onPress}>
      <View className="rounded-2xl bg-primary/10 px-3 py-3">
        <Icon as={icon} className="text-primary" size={18} />
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-sm text-muted-foreground">{label}</Text>
        <Text className="font-semibold text-foreground">{value}</Text>
      </View>
      <Icon as={ChevronDown} className="text-muted-foreground" size={18} />
    </Pressable>
  );
}

function PaymentTypeChip({
  icon,
  label,
  onPress,
  selected,
}: {
  icon: typeof ArrowUpRight;
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable className={`flex-1 flex-row items-center justify-center gap-2 rounded-[22px] border px-4 py-3 ${selected ? "border-primary bg-primary" : "border-border/70 bg-background"}`} onPress={onPress}>
      <Icon as={icon} className={selected ? "text-primary-foreground" : "text-foreground"} size={16} />
      <Text className={selected ? "text-primary-foreground" : "text-foreground"}>{label}</Text>
    </Pressable>
  );
}

function ModeChip({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable className={`rounded-full border px-4 py-3 ${selected ? "border-primary bg-primary" : "border-border/70 bg-background"}`} onPress={onPress}>
      <Text className={selected ? "text-primary-foreground" : "text-foreground"}>{label}</Text>
    </Pressable>
  );
}

function QuickAmountChip({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable className="rounded-full border border-primary/20 bg-primary/5 px-4 py-3" onPress={onPress}>
      <Text className="font-medium text-primary">{label}</Text>
    </Pressable>
  );
}

function PickerSearch({
  onChangeText,
  placeholder,
  value,
}: {
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View className="relative">
      <View className="absolute left-4 top-3.5 z-10">
        <Icon as={Search} className="text-muted-foreground" size={18} />
      </View>
      <Input className="pl-11" placeholder={placeholder} value={value} onChangeText={onChangeText} />
    </View>
  );
}

function sanitizeDecimal(value: string) {
  const normalized = value.replace(/[^0-9.]/g, "");
  const parts = normalized.split(".");
  if (parts.length <= 2) {
    return normalized;
  }
  return `${parts[0]}.${parts.slice(1).join("")}`;
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getAllocationValue(value: string | undefined) {
  if (!value) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function normalizeOptional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
