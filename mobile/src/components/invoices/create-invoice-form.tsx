import * as React from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Building2,
  ChevronDown,
  Package2,
  Plus,
  Info,
  ReceiptText,
  Search,
  Trash2,
  UserRound,
  ChevronUp,
} from "lucide-react-native";

import { INDIAN_STATES, formatStateDisplay } from "@/constants/indian-states";
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
import { businessService } from "@/services/business.service";
import { invoiceService } from "@/services/invoice.service";
import { inventoryService } from "@/services/inventory.service";
import { partyService } from "@/services/party.service";
import { useAuthStore } from "@/store/auth-store";
import type { BusinessWithRole } from "@/types/business";
import { GST_RATES, type InventoryItem } from "@/types/inventory";
import type { CreateInvoiceInput, CreateInvoiceNoteInput, InvoiceItemInput, NoteType } from "@/types/invoice";
import type { Party } from "@/types/party";
import { formatCurrency, formatCurrencyWithDecimals } from "@/lib/formatters";

type InvoiceType = "sales" | "purchase";
type PriceMode = "exclusive" | "inclusive";

type InvoiceItemForm = {
  description: string;
  discount_pct: string;
  gst_rate: number;
  hsn_code: string;
  item_id?: string;
  item_name: string;
  quantity: string;
  unit: string;
  unit_price: string;
};

type InvoiceForm = {
  invoice_date: string;
  notes: string;
  party_id: string;
  place_of_supply: string;
  price_mode: PriceMode;
};

const INITIAL_ITEM: InvoiceItemForm = {
  description: "",
  discount_pct: "0",
  gst_rate: 18,
  hsn_code: "",
  item_name: "",
  quantity: "1",
  unit: "PCS",
  unit_price: "",
};

const INITIAL_FORM: InvoiceForm = {
  invoice_date: new Date().toISOString().split("T")[0] ?? "",
  notes: "",
  party_id: "",
  place_of_supply: "",
  price_mode: "exclusive",
};

export function CreateInvoiceForm({ invoiceType }: { invoiceType: InvoiceType }) {
  const router = useRouter();
  const params = useLocalSearchParams<{
    invoice_id?: string;
    mode?: string;
    note_type?: string;
    source_invoice_id?: string;
  }>();
  const { session } = useAuthStore();
  const [business, setBusiness] = React.useState<BusinessWithRole | null>(null);
  const [parties, setParties] = React.useState<Party[]>([]);
  const [inventoryItems, setInventoryItems] = React.useState<InventoryItem[]>([]);
  const [form, setForm] = React.useState<InvoiceForm>(INITIAL_FORM);
  const [items, setItems] = React.useState<InvoiceItemForm[]>([INITIAL_ITEM]);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isPartyPickerOpen, setIsPartyPickerOpen] = React.useState(false);
  const [isItemPickerOpen, setIsItemPickerOpen] = React.useState(false);
  const [isStatePickerOpen, setIsStatePickerOpen] = React.useState(false);
  const [partySearch, setPartySearch] = React.useState("");
  const [itemSearch, setItemSearch] = React.useState("");
  const [activeItemIndex, setActiveItemIndex] = React.useState<number | null>(null);
  const [expandedItemIndex, setExpandedItemIndex] = React.useState(0);

  const sourceInvoiceId =
    typeof params.source_invoice_id === "string"
      ? params.source_invoice_id
      : typeof params.invoice_id === "string"
        ? params.invoice_id
        : "";
  const noteType =
    params.note_type === "credit_note" || params.note_type === "debit_note"
      ? (params.note_type as NoteType)
      : null;
  const isRevisionMode = params.mode === "revise";
  const isNoteMode = Boolean(sourceInvoiceId && noteType);

  const loadDependencies = React.useCallback(async () => {
    if (!session?.business_id) {
      setError("No active business found for invoice creation.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      setError(null);
      const [nextBusiness, nextParties, nextInventory, sourceInvoice] = await Promise.all([
        businessService.getBusiness(session.business_id),
        partyService.listParties(session.business_id, { include_inactive: "false" }),
        inventoryService.listInventoryItems(session.business_id, { include_inactive: "false" }),
        sourceInvoiceId ? invoiceService.getInvoice(session.business_id, sourceInvoiceId) : Promise.resolve(null),
      ]);

      setBusiness(nextBusiness);
      setParties(
        nextParties.filter((party) =>
          invoiceType === "sales"
            ? party.party_type === "customer" || party.party_type === "both"
            : party.party_type === "supplier" || party.party_type === "both",
        ),
      );
      setInventoryItems(nextInventory);
      setForm((current) => ({
        ...current,
        place_of_supply: current.place_of_supply || nextBusiness.state_code || "",
      }));

      if (sourceInvoice) {
        setForm((current) => ({
          ...current,
          invoice_date: INITIAL_FORM.invoice_date,
          notes: sourceInvoice.notes ?? "",
          party_id: sourceInvoice.party_id,
          place_of_supply: sourceInvoice.place_of_supply,
          price_mode: sourceInvoice.items[0]?.price_mode === "inclusive" ? "inclusive" : "exclusive",
        }));
        setItems(
          sourceInvoice.items.length
            ? sourceInvoice.items.map((item) => ({
                description: item.description ?? "",
                discount_pct: String(item.discount_pct ?? 0),
                gst_rate: item.gst_rate,
                hsn_code: item.hsn_code ?? "",
                item_id: item.item_id ?? undefined,
                item_name: item.item_name,
                quantity: String(item.quantity),
                unit: item.unit,
                unit_price: String(item.unit_price),
              }))
            : [INITIAL_ITEM],
        );
        setExpandedItemIndex(0);
      }
    } catch (loadError: any) {
      setError(
        loadError?.response?.data?.error?.message ??
          loadError?.response?.data?.message ??
          loadError?.message ??
          "Unable to load invoice dependencies.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [invoiceType, session?.business_id, sourceInvoiceId]);

  React.useEffect(() => {
    void loadDependencies();
  }, [loadDependencies]);

  const selectedParty = React.useMemo(
    () => parties.find((party) => party.id === form.party_id) ?? null,
    [form.party_id, parties],
  );

  const filteredParties = React.useMemo(() => {
    const query = partySearch.trim().toLowerCase();
    if (!query) return parties;
    return parties.filter((party) => {
      return (
        party.name.toLowerCase().includes(query) ||
        party.phone?.toLowerCase().includes(query) ||
        party.email?.toLowerCase().includes(query) ||
        party.gstin?.toLowerCase().includes(query)
      );
    });
  }, [parties, partySearch]);

  const filteredItems = React.useMemo(() => {
    const query = itemSearch.trim().toLowerCase();
    if (!query) return inventoryItems;
    return inventoryItems.filter((item) => {
      return (
        item.name.toLowerCase().includes(query) ||
        item.sku?.toLowerCase().includes(query) ||
        item.hsn_code?.toLowerCase().includes(query)
      );
    });
  }, [inventoryItems, itemSearch]);

  const selectedInventoryIds = React.useMemo(
    () => new Set(items.map((item) => item.item_id).filter(Boolean)),
    [items],
  );

  const isIgst = React.useMemo(() => {
    if (!business?.state_code || !form.place_of_supply) return false;
    return business.state_code !== form.place_of_supply;
  }, [business?.state_code, form.place_of_supply]);

  const totals = React.useMemo(() => calculateTotals(items, form.price_mode, isIgst), [form.price_mode, isIgst, items]);

  function updateForm<Key extends keyof InvoiceForm>(field: Key, value: InvoiceForm[Key]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateItem<Key extends keyof InvoiceItemForm>(index: number, field: Key, value: InvoiceItemForm[Key]) {
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)));
  }

  function addItem() {
    setItems((current) => {
      const next = [...current, INITIAL_ITEM];
      setExpandedItemIndex(next.length - 1);
      return next;
    });
  }

  function removeItem(index: number) {
    setItems((current) => {
      if (current.length === 1) return current;
      const next = current.filter((_, itemIndex) => itemIndex !== index);
      setExpandedItemIndex((currentExpanded) => {
        if (currentExpanded === index) return Math.max(0, index - 1);
        if (currentExpanded > index) return currentExpanded - 1;
        return currentExpanded;
      });
      return next;
    });
  }

  function applyInventoryItem(index: number, item: InventoryItem) {
    const duplicateIndex = items.findIndex(
      (lineItem, itemIndex) => itemIndex !== index && lineItem.item_id === item.id,
    );
    if (duplicateIndex >= 0) {
      setError(`"${item.name}" is already added in item ${duplicateIndex + 1}.`);
      setIsItemPickerOpen(false);
      return;
    }

    setItems((current) =>
      current.map((lineItem, itemIndex) =>
        itemIndex === index
          ? {
              ...lineItem,
              gst_rate: item.gst_rate,
              hsn_code: item.hsn_code ?? "",
              item_id: item.id,
              item_name: item.name,
              unit: item.unit,
              unit_price: String(invoiceType === "sales" ? item.selling_price : item.purchase_price),
            }
          : lineItem,
      ),
    );
  }

  function selectParty(party: Party) {
    setForm((current) => ({
      ...current,
      party_id: party.id,
      place_of_supply: party.state_code || current.place_of_supply,
    }));
    setIsPartyPickerOpen(false);
  }

  async function onSubmit() {
    if (!session?.business_id) {
      setError("No active business found for invoice creation.");
      return;
    }

    if (!form.party_id) {
      setError("Choose a party before creating the invoice.");
      return;
    }

    if (!form.invoice_date) {
      setError("Invoice date is required.");
      return;
    }

    if (!form.place_of_supply.trim()) {
      setError("Place of supply is required.");
      return;
    }

    const computedItems = buildComputedItems(items, form.price_mode, isIgst);
    if (!computedItems.success) {
      setError(computedItems.message);
      return;
    }

    if (
      invoiceType === "sales" &&
      computedItems.items.some((item) => {
        if (!item.item_id) return false;
        const inventoryItem = inventoryItems.find((entry) => entry.id === item.item_id);
        return inventoryItem ? item.quantity > inventoryItem.current_stock : false;
      })
    ) {
      setError("One or more items exceed available stock.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: CreateInvoiceInput = {
        invoice_date: form.invoice_date,
        is_igst: isIgst,
        items: computedItems.items,
        notes: normalizeOptional(form.notes),
        party_id: form.party_id,
        place_of_supply: form.place_of_supply,
        subtotal: totals.subtotal,
        taxable_amount: totals.taxableAmount,
        total_tax: totals.totalTax,
        round_off: totals.roundOff,
        grand_total: totals.grandTotal,
      };

      const createdInvoice = isNoteMode
        ? await invoiceService.createInvoiceNote(session.business_id, sourceInvoiceId, {
            ...(payload as CreateInvoiceNoteInput),
            note_reason: normalizeOptional(form.notes),
            note_type: noteType!,
          })
        : invoiceType === "sales"
          ? await invoiceService.createSalesInvoice(payload)
          : await invoiceService.createPurchaseInvoice(payload);

      router.replace({
        pathname: "/(app)/invoices",
        params: {
          refresh: String(Date.now()),
          toast: isNoteMode
            ? `${noteType === "credit_note" ? "Credit note" : "Debit note"} created successfully.`
            : `${invoiceType === "sales" ? "Sales" : "Purchase"} invoice created successfully.`,
        },
      });
    } catch (submitError: any) {
      setError(
        submitError?.response?.data?.error?.message ??
          submitError?.response?.data?.message ??
          submitError?.message ??
          "Unable to create the invoice.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <FormScreenSkeleton rowCount={6} showActionCard />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-6 pb-28 pt-4">
        <View className="gap-6">
          <SubpageHeader
            backHref="/(app)/invoices"
            eyebrow="Invoices"
            subtitle={
              isNoteMode
                ? `Create a ${noteType === "credit_note" ? "credit note" : "debit note"} from an existing invoice.`
                : isRevisionMode
                  ? `Revise an existing ${invoiceType} invoice with prefilled line items.`
                  : `Create a ${invoiceType} invoice with live party and inventory data.`
            }
            title={
              isNoteMode
                ? noteType === "credit_note"
                  ? "Create credit note"
                  : "Create debit note"
                : isRevisionMode
                  ? invoiceType === "sales"
                    ? "Revise sales invoice"
                    : "Revise purchase invoice"
                  : invoiceType === "sales"
                    ? "Create sales invoice"
                    : "Create purchase invoice"
            }
          />

          {isNoteMode ? (
            <Card className="rounded-[28px] border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle>{noteType === "credit_note" ? "Credit Note Guide" : "Debit Note Guide"}</CardTitle>
                <CardDescription>
                  {noteType === "credit_note"
                    ? "Use a credit note when you need to reduce the value of an already issued invoice."
                    : "Use a debit note when you need to increase or correct the value of an already issued invoice."}
                </CardDescription>
              </CardHeader>
              <CardContent className="gap-3">
                <InfoRow
                  text={
                    noteType === "credit_note"
                      ? "Common use cases: returns, refunds, post-sale discounts, damaged goods, or overbilling corrections."
                      : "Common use cases: underbilling corrections, extra charges, missed items, or additional value that must be added after billing."
                  }
                />
                <InfoRow text="The original invoice is loaded on purpose so party, tax mode, and item details stay aligned with the source bill." />
                <InfoRow text="Adjust only the lines or quantities that should change. You do not need to rebuild the full invoice from scratch." />
              </CardContent>
            </Card>
          ) : null}

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Basic details</CardTitle>
              <CardDescription>Choose the party, invoice date, price mode, and place of supply.</CardDescription>
            </CardHeader>
            <CardContent className="gap-5">
              <Field label="Party" required>
                <SelectionCard
                  icon={UserRound}
                  label={invoiceType === "sales" ? "Customer" : "Supplier"}
                  onPress={() => setIsPartyPickerOpen(true)}
                  value={selectedParty ? selectedParty.name : `Choose ${invoiceType === "sales" ? "customer" : "supplier"}`}
                />
              </Field>

              <Field label="Invoice date" required>
                <Input value={form.invoice_date} onChangeText={(value) => updateForm("invoice_date", value)} placeholder="YYYY-MM-DD" />
              </Field>

              <Field label="Price mode">
                <View className="flex-row gap-3">
                  <ChoiceChip label="Exclusive" selected={form.price_mode === "exclusive"} onPress={() => updateForm("price_mode", "exclusive")} />
                  <ChoiceChip label="Inclusive" selected={form.price_mode === "inclusive"} onPress={() => updateForm("price_mode", "inclusive")} />
                </View>
              </Field>

              <Field label="Place of supply" required>
                <SelectionCard
                  icon={Building2}
                  label="State code"
                  onPress={() => setIsStatePickerOpen(true)}
                  value={form.place_of_supply ? formatStateCode(form.place_of_supply) : "Choose state"}
                />
              </Field>

              <Field label="Tax mode">
                <TaxModeCard isIgst={isIgst} />
              </Field>
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Line items</CardTitle>
              <CardDescription>Add inventory-backed lines and adjust quantity, price, discount, and GST.</CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              {items.map((item, index) => {
                const itemTotal = calculateItemTotal(item, form.price_mode, isIgst);
                const stockItem = item.item_id ? inventoryItems.find((entry) => entry.id === item.item_id) ?? null : null;
                const isExpanded = expandedItemIndex === index;
                return (
                  <View key={`invoice-item-${index}`} className="rounded-[26px] border border-border/70 bg-background px-4 py-4">
                    <Pressable
                      className="mb-1 flex-row items-center justify-between gap-4"
                      onPress={() => setExpandedItemIndex(index)}>
                      <View className="flex-1 gap-1">
                        <Text className="font-semibold text-foreground">
                          Item {index + 1}: {item.item_name || "Untitled line"}
                        </Text>
                        <Text className="text-sm text-muted-foreground">
                          {item.quantity || "0"} {item.unit || "PCS"} | {formatCurrency(itemTotal)}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-2">
                        {items.length > 1 ? (
                          <Pressable
                            className="rounded-full border border-destructive/30 bg-destructive/10 px-3 py-2"
                            onPress={() => removeItem(index)}>
                            <Icon as={Trash2} className="text-destructive" size={16} />
                          </Pressable>
                        ) : null}
                        <View className="rounded-full border border-border/70 bg-background px-3 py-2">
                          <Icon as={isExpanded ? ChevronUp : ChevronDown} className="text-foreground" size={16} />
                        </View>
                      </View>
                    </Pressable>

                    {isExpanded ? (
                    <View className="gap-4">
                      <Field label="Inventory item">
                        <SelectionCard
                          icon={Package2}
                          label="Select inventory"
                          onPress={() => {
                            setActiveItemIndex(index);
                            setIsItemPickerOpen(true);
                          }}
                          value={item.item_name || "Choose from inventory or fill manually"}
                        />
                      </Field>

                      <Field label="Item name" required>
                        <Input value={item.item_name} onChangeText={(value) => updateItem(index, "item_name", value)} placeholder="Item name" />
                      </Field>

                      <View className="flex-row gap-4">
                        <Field className="flex-1" label="HSN code">
                          <Input value={item.hsn_code} onChangeText={(value) => updateItem(index, "hsn_code", value.toUpperCase())} />
                        </Field>
                        <Field className="flex-1" label="Unit" required>
                          <Input value={item.unit} onChangeText={(value) => updateItem(index, "unit", value.toUpperCase())} placeholder="PCS" />
                        </Field>
                      </View>

                      <View className="flex-row gap-4">
                        <Field className="flex-1" label="Quantity" required>
                          <Input value={item.quantity} onChangeText={(value) => updateItem(index, "quantity", sanitizeDecimal(value))} keyboardType="decimal-pad" />
                        </Field>
                        <Field className="flex-1" label="Unit price" required>
                          <Input value={item.unit_price} onChangeText={(value) => updateItem(index, "unit_price", sanitizeDecimal(value))} keyboardType="decimal-pad" />
                        </Field>
                      </View>

                      <Field label="Discount %">
                        <Input value={item.discount_pct} onChangeText={(value) => updateItem(index, "discount_pct", sanitizePercent(value))} keyboardType="decimal-pad" />
                      </Field>

                      <Field label="GST rate" required>
                        <View className="flex-row flex-wrap gap-2">
                          {GST_RATES.map((rate) => (
                            <TinyChip
                              key={`${index}-gst-${rate}`}
                              label={`${rate}%`}
                              selected={item.gst_rate === rate}
                              onPress={() => updateItem(index, "gst_rate", rate)}
                            />
                          ))}
                        </View>
                      </Field>

                      <Field label="Description">
                        <Textarea
                          className="min-h-[90px] rounded-[22px] border-border/70 bg-muted/35 px-4 py-3"
                          value={item.description}
                          onChangeText={(value) => updateItem(index, "description", value)}
                          placeholder="Optional line note"
                        />
                      </Field>

                      {stockItem ? (
                        <View className="rounded-[22px] border border-border/70 bg-muted/25 px-4 py-3">
                          <Text className="text-xs uppercase tracking-[1px] text-muted-foreground">
                            Available stock {stockItem.current_stock} {stockItem.unit}
                          </Text>
                        </View>
                      ) : null}

                      <View className="rounded-[24px] border border-primary/20 bg-primary/5 px-4 py-4">
                        <View className="flex-row items-center justify-between gap-4">
                          <Text className="font-medium text-foreground">Line total</Text>
                          <Text className="text-base font-semibold text-foreground">{formatCurrency(itemTotal)}</Text>
                        </View>
                      </View>
                    </View>
                    ) : null}
                  </View>
                );
              })}

              <Button variant="outline" className="h-14 rounded-[24px]" onPress={addItem}>
                <Icon as={Plus} className="text-primary" size={18} />
                <Text>Add line item</Text>
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Invoice summary</CardTitle>
              <CardDescription>Computed totals using the same tax and rounding rules as the web flow.</CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              <SummaryRow label="Subtotal" value={formatCurrencyWithDecimals(totals.subtotal)} />
              <SummaryRow label="Taxable amount" value={formatCurrencyWithDecimals(totals.taxableAmount)} />
              <SummaryRow label="Total tax" value={formatCurrencyWithDecimals(totals.totalTax)} />
              <SummaryRow label="Round off" value={formatCurrencyWithDecimals(totals.roundOff)} />
              <GrandTotalCard value={formatCurrencyWithDecimals(totals.grandTotal)} />
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <CardDescription>Optional notes or billing context for the invoice.</CardDescription>
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
                <Text className="text-base">Creating invoice...</Text>
              </>
            ) : (
              <>
                <Icon as={ReceiptText} className="text-primary-foreground" size={18} />
                <Text className="text-base">Create {invoiceType} invoice</Text>
              </>
            )}
          </Button>
        </View>
      </ScrollView>

      <Dialog open={isPartyPickerOpen} onOpenChange={setIsPartyPickerOpen}>
        <DialogContent className="max-w-[420px] rounded-[28px]">
          <DialogHeader>
            <DialogTitle>Choose {invoiceType === "sales" ? "customer" : "supplier"}</DialogTitle>
            <DialogDescription>Search the party book and pick one party for this invoice.</DialogDescription>
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
                      {party.phone || party.email || party.gstin || "No extra details"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        </DialogContent>
      </Dialog>

      <Dialog open={isItemPickerOpen} onOpenChange={setIsItemPickerOpen}>
        <DialogContent className="max-w-[420px] rounded-[28px]">
          <DialogHeader>
            <DialogTitle>Choose inventory item</DialogTitle>
            <DialogDescription>Pick one item to prefill the invoice line with live inventory pricing and tax details.</DialogDescription>
          </DialogHeader>
          <View className="gap-4">
            <PickerSearch value={itemSearch} onChangeText={setItemSearch} placeholder="Search inventory" />
            <ScrollView className="max-h-[360px]">
              <View className="gap-3">
                {filteredItems.map((item) => (
                  <Pressable
                    key={item.id}
                    className={`rounded-[22px] border px-4 py-4 ${
                      selectedInventoryIds.has(item.id) && items[activeItemIndex ?? -1]?.item_id !== item.id
                        ? "border-destructive/20 bg-destructive/5"
                        : "border-border/70 bg-background"
                    }`}
                    disabled={selectedInventoryIds.has(item.id) && items[activeItemIndex ?? -1]?.item_id !== item.id}
                    onPress={() => {
                      if (activeItemIndex != null) {
                        applyInventoryItem(activeItemIndex, item);
                      }
                      setIsItemPickerOpen(false);
                    }}>
                    <View className="flex-row items-center justify-between gap-4">
                      <View className="flex-1 gap-1">
                        <Text className="font-semibold text-foreground">{item.name}</Text>
                        <Text className="text-sm text-muted-foreground">
                          {item.current_stock} {item.unit} available
                          {item.sku ? ` | SKU ${item.sku}` : ""}
                        </Text>
                      </View>
                      <Text className="font-semibold text-foreground">
                        {formatCurrency(invoiceType === "sales" ? item.selling_price : item.purchase_price)}
                      </Text>
                    </View>
                    {selectedInventoryIds.has(item.id) && (!items[activeItemIndex ?? -1]?.item_id || items[activeItemIndex ?? -1]?.item_id !== item.id) ? (
                      <Text className="mt-2 text-xs text-destructive">Already added to this invoice</Text>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        </DialogContent>
      </Dialog>

      <Dialog open={isStatePickerOpen} onOpenChange={setIsStatePickerOpen}>
        <DialogContent className="max-w-[420px] rounded-[28px]">
          <DialogHeader>
            <DialogTitle>Select place of supply</DialogTitle>
            <DialogDescription>Choose the GST state used for tax mode calculation.</DialogDescription>
          </DialogHeader>
          <ScrollView className="max-h-[360px]">
            <View className="gap-3">
              {INDIAN_STATES.map((state) => (
                <Pressable
                  key={state.code}
                  className={`rounded-[22px] border px-4 py-4 ${form.place_of_supply === state.code ? "border-primary bg-primary/10" : "border-border/70 bg-background"}`}
                  onPress={() => {
                    updateForm("place_of_supply", state.code);
                    setIsStatePickerOpen(false);
                  }}>
                  <Text className="font-semibold text-foreground">{formatStateDisplay(state)}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </DialogContent>
      </Dialog>
      {isSubmitting ? <SubmittingOverlay label="Creating invoice..." /> : null}
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
  icon,
  label,
  onPress,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  onPress: () => void;
  value: string;
}) {
  return (
    <Pressable className="flex-row items-center gap-4 rounded-[24px] border border-border/70 bg-background px-4 py-4" onPress={onPress}>
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

function ChoiceChip({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable className={`flex-1 items-center rounded-[22px] border px-4 py-3 ${selected ? "border-primary bg-primary" : "border-border/70 bg-background"}`} onPress={onPress}>
      <Text className={selected ? "text-primary-foreground" : "text-foreground"}>{label}</Text>
    </Pressable>
  );
}

function TinyChip({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable className={`rounded-full border px-3 py-2 ${selected ? "border-primary bg-primary" : "border-border/70 bg-background"}`} onPress={onPress}>
      <Text className={selected ? "text-primary-foreground" : "text-foreground"}>{label}</Text>
    </Pressable>
  );
}

function SummaryRow({
  label,
  strong,
  value,
}: {
  label: string;
  strong?: boolean;
  value: string;
}) {
  return (
    <View className="flex-row items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background px-4 py-4">
      <Text className={strong ? "font-semibold text-foreground" : "text-muted-foreground"}>{label}</Text>
      <Text className={strong ? "font-semibold text-foreground" : "font-medium text-foreground"}>{value}</Text>
    </View>
  );
}

function GrandTotalCard({ value }: { value: string }) {
  return (
    <View className="rounded-[24px] border border-primary/20 bg-primary/5 px-4 py-5">
      <Text className="text-xs uppercase tracking-[1px] text-muted-foreground">Grand total</Text>
      <Text className="mt-2 text-3xl font-extrabold text-foreground">{value}</Text>
    </View>
  );
}

function TaxModeCard({ isIgst }: { isIgst: boolean }) {
  const toneClass = isIgst
    ? "border-amber-500/30 bg-amber-500/10"
    : "border-emerald-500/30 bg-emerald-500/10";
  const badgeClass = isIgst
    ? "bg-amber-600 text-white"
    : "bg-emerald-600 text-white";
  const subtitle = isIgst
    ? "Inter-state billing will apply IGST on each line item."
    : "Same-state billing will split tax into CGST and SGST.";

  return (
    <View className={`rounded-[24px] border px-4 py-4 ${toneClass}`}>
      <View className="flex-row items-center justify-between gap-4">
        <View className="flex-1 gap-1 pr-2">
          <Text className="text-sm text-muted-foreground">Computed tax mode</Text>
          <Text className="font-semibold text-foreground">{subtitle}</Text>
        </View>
        <View className={`rounded-full px-4 py-2 ${badgeClass}`}>
          <Text className="text-xs font-semibold uppercase tracking-[1px]">{isIgst ? "IGST" : "CGST + SGST"}</Text>
        </View>
      </View>
    </View>
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

function InfoRow({ text }: { text: string }) {
  return (
    <View className="flex-row items-start gap-3 rounded-[22px] border border-primary/15 bg-background px-4 py-4">
      <View className="rounded-2xl bg-primary/10 px-3 py-3">
        <Icon as={Info} className="text-primary" size={18} />
      </View>
      <Text className="flex-1 text-sm leading-6 text-muted-foreground">{text}</Text>
    </View>
  );
}

function SubmittingOverlay({ label }: { label: string }) {
  return (
    <View className="absolute bottom-0 left-0 right-0 top-0 items-center justify-center bg-black/25 px-8">
      <View className="w-full max-w-[280px] items-center gap-4 rounded-[28px] border border-border/70 bg-background px-6 py-6">
        <ActivityIndicator color="#2563eb" size="large" />
        <Text className="text-base font-semibold text-foreground">{label}</Text>
        <Text className="text-center text-sm leading-5 text-muted-foreground">
          Please wait while we save your invoice.
        </Text>
      </View>
    </View>
  );
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function sanitizeDecimal(value: string) {
  const normalized = value.replace(/[^0-9.]/g, "");
  const parts = normalized.split(".");
  if (parts.length <= 2) {
    return normalized;
  }
  return `${parts[0]}.${parts.slice(1).join("")}`;
}

function sanitizePercent(value: string) {
  const sanitized = sanitizeDecimal(value);
  const numeric = Number(sanitized);
  if (!sanitized) return "";
  if (Number.isNaN(numeric)) return "";
  return String(Math.min(100, Math.max(0, numeric)));
}

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function calculateItemTotals(item: InvoiceItemForm, priceMode: PriceMode, isIgst: boolean) {
  const quantity = parseNumber(item.quantity);
  const unitPrice = round2(parseNumber(item.unit_price));
  const discountPct = parseNumber(item.discount_pct);
  const gstRate = item.gst_rate || 0;

  const grossAmount = round2(quantity * unitPrice);
  const divisor = 1 + gstRate / 100;
  const exclusiveBase = priceMode === "inclusive" ? round2(grossAmount / divisor) : grossAmount;
  const discountAmount = round2(exclusiveBase * (discountPct / 100));
  const taxableValue = round2(exclusiveBase - discountAmount);
  const cgstRate = isIgst ? 0 : round2(gstRate / 2);
  const sgstRate = isIgst ? 0 : round2(gstRate / 2);
  const igstRate = isIgst ? round2(gstRate) : 0;
  const cgstAmount = round2((taxableValue * cgstRate) / 100);
  const sgstAmount = round2((taxableValue * sgstRate) / 100);
  const igstAmount = round2((taxableValue * igstRate) / 100);
  const totalAmount = round2(taxableValue + cgstAmount + sgstAmount + igstAmount);

  return {
    cgstAmount,
    cgstRate,
    discountAmount,
    gstRate,
    igstAmount,
    igstRate,
    quantity,
    sgstAmount,
    sgstRate,
    taxableValue,
    totalAmount,
    unitPrice,
  };
}

function calculateItemTotal(item: InvoiceItemForm, priceMode: PriceMode, isIgst: boolean) {
  return calculateItemTotals(item, priceMode, isIgst).totalAmount;
}

function calculateTotals(items: InvoiceItemForm[], priceMode: PriceMode, isIgst: boolean) {
  let subtotal = 0;
  let taxableAmount = 0;
  let totalTax = 0;

  items.forEach((item) => {
    const line = calculateItemTotals(item, priceMode, isIgst);
    const grossAmount = round2(line.quantity * line.unitPrice);
    const exclusiveBase = priceMode === "inclusive" ? round2(grossAmount / (1 + line.gstRate / 100)) : grossAmount;
    subtotal += exclusiveBase;
    taxableAmount += line.taxableValue;
    totalTax += line.cgstAmount + line.sgstAmount + line.igstAmount;
  });

  subtotal = round2(subtotal);
  taxableAmount = round2(taxableAmount);
  totalTax = round2(totalTax);
  const totalBeforeRounding = round2(taxableAmount + totalTax);
  const grandTotal = round2(Math.round(totalBeforeRounding));
  const roundOff = round2(grandTotal - totalBeforeRounding);

  return {
    grandTotal,
    roundOff,
    subtotal,
    taxableAmount,
    totalTax,
  };
}

function buildComputedItems(items: InvoiceItemForm[], priceMode: PriceMode, isIgst: boolean) {
  const computed: InvoiceItemInput[] = [];
  const seenInventoryIds = new Set<string>();
  const seenManualNames = new Set<string>();

  for (const item of items) {
    if (!item.item_name.trim()) {
      return { success: false as const, message: "Every invoice line needs an item name." };
    }

    if (!item.unit.trim()) {
      return { success: false as const, message: "Every invoice line needs a unit." };
    }

    const quantity = parseNumber(item.quantity);
    const unitPrice = parseNumber(item.unit_price);
    const discountPct = parseNumber(item.discount_pct);

    if (quantity <= 0) {
      return { success: false as const, message: "Quantity must be greater than zero for every item." };
    }

    if (unitPrice < 0) {
      return { success: false as const, message: "Unit price cannot be negative." };
    }

    if (discountPct < 0 || discountPct > 100) {
      return { success: false as const, message: "Discount percentage must stay between 0 and 100." };
    }

    if (item.item_id) {
      if (seenInventoryIds.has(item.item_id)) {
        return { success: false as const, message: `The inventory item "${item.item_name.trim()}" cannot be added twice.` };
      }
      seenInventoryIds.add(item.item_id);
    } else {
      const normalizedName = item.item_name.trim().toLowerCase();
      if (seenManualNames.has(normalizedName)) {
        return { success: false as const, message: `The item "${item.item_name.trim()}" cannot be added twice.` };
      }
      seenManualNames.add(normalizedName);
    }

    const line = calculateItemTotals(item, priceMode, isIgst);
    computed.push({
      cgst_amount: line.cgstAmount,
      cgst_rate: line.cgstRate,
      description: normalizeOptional(item.description),
      discount_amount: line.discountAmount,
      discount_pct: discountPct,
      gst_rate: item.gst_rate,
      hsn_code: normalizeOptional(item.hsn_code),
      igst_amount: line.igstAmount,
      igst_rate: line.igstRate,
      item_id: item.item_id,
      item_name: item.item_name.trim(),
      price_mode: priceMode,
      quantity,
      sgst_amount: line.sgstAmount,
      sgst_rate: line.sgstRate,
      taxable_value: line.taxableValue,
      total_amount: line.totalAmount,
      unit: item.unit.trim(),
      unit_price: line.unitPrice,
    });
  }

  return { success: true as const, items: computed };
}

function normalizeOptional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function formatStateCode(code: string) {
  const state = INDIAN_STATES.find((entry) => entry.code === code);
  return state ? formatStateDisplay(state) : code;
}
