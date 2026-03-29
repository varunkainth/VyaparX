import * as React from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Barcode, Boxes, ChevronDown, PackagePlus, Percent, Ruler, Wand2 } from "lucide-react-native";

import { SubpageHeader } from "@/components/subpage-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ToastBanner, useTimedToast } from "@/components/ui/toast-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { inventoryService } from "@/services/inventory.service";
import { useAuthStore } from "@/store/auth-store";
import { GST_RATES, INVENTORY_UNITS } from "@/types/inventory";

type CreateFormState = {
  name: string;
  sku: string;
  hsn_code: string;
  description: string;
  unit: string;
  gst_rate: string;
  purchase_price: string;
  selling_price: string;
  low_stock_threshold: string;
  opening_stock: string;
  opening_stock_note: string;
};

const INITIAL_FORM: CreateFormState = {
  name: "",
  sku: "",
  hsn_code: "",
  description: "",
  unit: "PCS",
  gst_rate: "18",
  purchase_price: "",
  selling_price: "",
  low_stock_threshold: "",
  opening_stock: "",
  opening_stock_note: "",
};

export default function InventoryCreateScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const { message, showToast } = useTimedToast();
  const [form, setForm] = React.useState<CreateFormState>(INITIAL_FORM);
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isUnitPickerOpen, setIsUnitPickerOpen] = React.useState(false);
  const [isTaxPickerOpen, setIsTaxPickerOpen] = React.useState(false);

  function updateField<Key extends keyof CreateFormState>(field: Key, value: CreateFormState[Key]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function generateSKU() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    updateField("sku", `SKU-${timestamp}-${random}`);
  }

  async function onSubmit() {
    if (!session?.business_id) {
      setError("No active business found for inventory creation.");
      return;
    }

    if (form.name.trim().length < 2) {
      setError("Item name must be at least 2 characters.");
      return;
    }

    if (!form.unit.trim()) {
      setError("Choose a unit for this item.");
      return;
    }

    const gstRate = Number(form.gst_rate);
    const purchasePrice = Number(form.purchase_price);
    const sellingPrice = Number(form.selling_price);
    const lowStockThreshold = form.low_stock_threshold.trim() ? Number(form.low_stock_threshold) : undefined;
    const openingStock = form.opening_stock.trim() ? Number(form.opening_stock) : undefined;

    if (Number.isNaN(gstRate) || gstRate < 0) {
      setError("GST rate must be a valid non-negative number.");
      return;
    }

    if (Number.isNaN(purchasePrice) || purchasePrice < 0) {
      setError("Purchase price must be a valid non-negative number.");
      return;
    }

    if (Number.isNaN(sellingPrice) || sellingPrice < 0) {
      setError("Selling price must be a valid non-negative number.");
      return;
    }

    if (lowStockThreshold != null && (Number.isNaN(lowStockThreshold) || lowStockThreshold < 0)) {
      setError("Low stock threshold must be a valid non-negative number.");
      return;
    }

    if (openingStock != null && (Number.isNaN(openingStock) || openingStock < 0)) {
      setError("Opening stock must be a valid non-negative number.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const createdItem = await inventoryService.createInventoryItem(session.business_id, {
        name: form.name.trim(),
        sku: normalizeOptional(form.sku),
        hsn_code: normalizeOptional(form.hsn_code),
        description: normalizeOptional(form.description),
        unit: form.unit.trim(),
        gst_rate: gstRate,
        purchase_price: purchasePrice,
        selling_price: sellingPrice,
        low_stock_threshold: lowStockThreshold,
        opening_stock: openingStock,
        opening_stock_note: normalizeOptional(form.opening_stock_note),
      });

      showToast(`${createdItem.name} was created successfully.`);
      setForm(INITIAL_FORM);
      setTimeout(() => {
        router.replace({
          pathname: "/(app)/inventory",
          params: {
            refresh: String(Date.now()),
            toast: `${createdItem.name} created successfully.`,
          },
        });
      }, 500);
    } catch (submitError: any) {
      setError(
        submitError?.response?.data?.error?.message ??
          submitError?.response?.data?.message ??
          submitError?.message ??
          "Unable to create the inventory item.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-6 pb-28 pt-4">
        <View className="gap-6">
          <SubpageHeader
            backHref="/(app)/inventory"
            eyebrow="Inventory"
            subtitle="Create a new stock item with pricing, tax, threshold, and opening stock in one flow."
            title="Create item"
          />

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Item details</CardTitle>
              <CardDescription>Start with the commercial identity of the product.</CardDescription>
            </CardHeader>
            <CardContent className="gap-5">
              <Field label="Item name">
                <Input
                  placeholder="Parle-G Carton"
                  returnKeyType="next"
                  value={form.name}
                  onChangeText={(value) => updateField("name", value)}
                />
              </Field>

              <Field label="SKU">
                <View className="flex-row items-center gap-3 rounded-[22px] border border-border/70 bg-muted/35 px-4">
                  <Icon as={Barcode} className="text-muted-foreground" size={18} />
                  <Input
                    className="h-14 flex-1 rounded-none border-0 bg-transparent px-0 text-base shadow-none"
                    placeholder="SKU-1024"
                    value={form.sku}
                    onChangeText={(value) => updateField("sku", value)}
                  />
                  <Button
                    className="h-10 rounded-full px-3"
                    size="sm"
                    variant="outline"
                    onPress={generateSKU}>
                    <Icon as={Wand2} className="text-foreground" size={14} />
                    <Text>Auto</Text>
                  </Button>
                </View>
              </Field>

              <Field label="HSN code">
                <Input
                  keyboardType="number-pad"
                  placeholder="1905"
                  value={form.hsn_code}
                  onChangeText={(value) => updateField("hsn_code", value)}
                />
              </Field>

              <Field label="Description">
                <Textarea
                  className="min-h-[110px] rounded-[22px] border-border/70 bg-muted/35 px-4 py-3"
                  placeholder="Optional notes about packaging, brand, or item details"
                  value={form.description}
                  onChangeText={(value) => updateField("description", value)}
                />
              </Field>
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Unit and tax</CardTitle>
              <CardDescription>Choose the measurement unit and GST slab with compact mobile pickers.</CardDescription>
            </CardHeader>
            <CardContent className="gap-5">
              <Field label="Unit">
                <SelectionCard
                  icon={Ruler}
                  label="Measurement unit"
                  value={form.unit}
                  onPress={() => setIsUnitPickerOpen(true)}
                />
              </Field>

              <Field label="GST rate">
                <SelectionCard
                  icon={Percent}
                  label="Tax slab"
                  value={`${form.gst_rate}% GST`}
                  onPress={() => setIsTaxPickerOpen(true)}
                />
              </Field>
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Pricing and stock</CardTitle>
              <CardDescription>Set default prices and optional inventory thresholds.</CardDescription>
            </CardHeader>
            <CardContent className="gap-5">
              <View className="flex-row gap-4">
                <Field className="flex-1" label="Purchase price">
                  <Input
                    keyboardType="decimal-pad"
                    placeholder="0"
                    value={form.purchase_price}
                    onChangeText={(value) => updateField("purchase_price", value)}
                  />
                </Field>
                <Field className="flex-1" label="Selling price">
                  <Input
                    keyboardType="decimal-pad"
                    placeholder="0"
                    value={form.selling_price}
                    onChangeText={(value) => updateField("selling_price", value)}
                  />
                </Field>
              </View>

              <View className="flex-row gap-4">
                <Field className="flex-1" label="Low stock threshold">
                  <Input
                    keyboardType="decimal-pad"
                    placeholder="Optional"
                    value={form.low_stock_threshold}
                    onChangeText={(value) => updateField("low_stock_threshold", value)}
                  />
                </Field>
                <Field className="flex-1" label="Opening stock">
                  <Input
                    keyboardType="decimal-pad"
                    placeholder="Optional"
                    value={form.opening_stock}
                    onChangeText={(value) => updateField("opening_stock", value)}
                  />
                </Field>
              </View>

              <Field label="Opening stock note">
                <Textarea
                  className="min-h-[96px] rounded-[22px] border-border/70 bg-muted/35 px-4 py-3"
                  placeholder="Optional note for the first stock balance"
                  value={form.opening_stock_note}
                  onChangeText={(value) => updateField("opening_stock_note", value)}
                />
              </Field>
            </CardContent>
          </Card>

          {error ? (
            <MessageCard
              icon={Boxes}
              text={error}
              tone="border-destructive/30 bg-destructive/10"
              textTone="text-destructive"
            />
          ) : null}

          <Button className="mb-4 h-14 rounded-[24px]" disabled={isSubmitting} onPress={onSubmit}>
            {isSubmitting ? (
              <>
                <ActivityIndicator color="#ffffff" />
                <Text className="text-base">Creating item...</Text>
              </>
            ) : (
              <>
                <Icon as={PackagePlus} className="text-primary-foreground" size={18} />
                <Text className="text-base">Create inventory item</Text>
              </>
            )}
          </Button>
        </View>
      </ScrollView>
      <Dialog open={isUnitPickerOpen} onOpenChange={setIsUnitPickerOpen}>
        <DialogContent className="max-w-[420px] rounded-[28px]">
          <DialogHeader>
            <DialogTitle>Select unit</DialogTitle>
            <DialogDescription>Choose how this item is counted in stock and billing.</DialogDescription>
          </DialogHeader>
          <ScrollView className="max-h-[360px]">
            <View className="gap-3">
              {INVENTORY_UNITS.map((unit) => (
                <PickerOption
                  key={unit}
                  selected={form.unit === unit}
                  title={unit}
                  onPress={() => {
                    updateField("unit", unit);
                    setIsUnitPickerOpen(false);
                  }}
                />
              ))}
            </View>
          </ScrollView>
        </DialogContent>
      </Dialog>
      <Dialog open={isTaxPickerOpen} onOpenChange={setIsTaxPickerOpen}>
        <DialogContent className="max-w-[420px] rounded-[28px]">
          <DialogHeader>
            <DialogTitle>Select GST rate</DialogTitle>
            <DialogDescription>Pick the GST slab used for this item.</DialogDescription>
          </DialogHeader>
          <View className="gap-3">
            {GST_RATES.map((rate) => (
              <PickerOption
                key={String(rate)}
                selected={form.gst_rate === String(rate)}
                title={`${rate}%`}
                onPress={() => {
                  updateField("gst_rate", String(rate));
                  setIsTaxPickerOpen(false);
                }}
              />
            ))}
          </View>
        </DialogContent>
      </Dialog>
      {isSubmitting ? <SubmittingOverlay label="Creating item..." /> : null}
      <ToastBanner message={message} variant="success" />
    </SafeAreaView>
  );
}

function Field({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <View className={className}>
      <View className="gap-2">
        <Label>{label}</Label>
        {children}
      </View>
    </View>
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
    <Pressable
      className={`rounded-full border px-4 py-2.5 ${selected ? "border-primary bg-primary" : "border-border/70 bg-background"}`}
      onPress={onPress}>
      <Text className={selected ? "text-primary-foreground" : "text-foreground"}>{label}</Text>
    </Pressable>
  );
}

function SelectionCard({
  icon,
  label,
  onPress,
  value,
}: {
  icon: typeof Ruler;
  label: string;
  onPress: () => void;
  value: string;
}) {
  return (
    <Pressable
      className="flex-row items-center gap-4 rounded-[24px] border border-border/70 bg-background px-4 py-4"
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

function PickerOption({
  onPress,
  selected,
  title,
}: {
  onPress: () => void;
  selected: boolean;
  title: string;
}) {
  return (
    <Pressable
      className={`rounded-[22px] border px-4 py-4 ${selected ? "border-primary bg-primary/10" : "border-border/70 bg-background"}`}
      onPress={onPress}>
      <Text className="font-semibold text-foreground">{title}</Text>
    </Pressable>
  );
}

function MessageCard({
  icon,
  text,
  textTone,
  tone,
}: {
  icon: typeof Boxes;
  text: string;
  textTone: string;
  tone: string;
}) {
  return (
    <View className={`rounded-[24px] border px-4 py-4 ${tone}`}>
      <View className="flex-row items-center gap-3">
        <Icon as={icon} className={textTone} size={18} />
        <Text className={`flex-1 text-sm ${textTone}`}>{text}</Text>
      </View>
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
          Please wait while we save your item.
        </Text>
      </View>
    </View>
  );
}

function normalizeOptional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
