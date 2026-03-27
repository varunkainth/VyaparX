import * as React from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PenLine, Trash2 } from "lucide-react-native";

import { FormScreenSkeleton } from "@/components/screen-skeleton";
import { SubpageHeader } from "@/components/subpage-header";
import { DevCacheIndicator } from "@/components/dev-cache-indicator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ToastBanner, useTimedToast } from "@/components/ui/toast-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { CACHE_TTL_MS, formatCacheAge, isCacheStale } from "@/lib/cache-policy";
import { formatCurrency, formatShortDate } from "@/lib/formatters";
import { useAuthStore } from "@/store/auth-store";
import { useInventoryStore } from "@/store/inventory-store";
import { GST_RATES, INVENTORY_UNITS } from "@/types/inventory";

type EditFormState = {
  name: string;
  sku: string;
  hsn_code: string;
  description: string;
  unit: string;
  gst_rate: string;
  purchase_price: string;
  selling_price: string;
  low_stock_threshold: string;
};

export default function InventoryEditScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { session } = useAuthStore();
  const deleteInventoryItem = useInventoryStore((state) => state.deleteInventoryItem);
  const ensureInventoryDetail = useInventoryStore((state) => state.ensureInventoryDetail);
  const ensureStockMovements = useInventoryStore((state) => state.ensureStockMovements);
  const updateInventoryItem = useInventoryStore((state) => state.updateInventoryItem);
  const { message, showToast } = useTimedToast();
  const [form, setForm] = React.useState<EditFormState | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const itemId = typeof params.id === "string" ? params.id : undefined;
  const item = useInventoryStore((state) => (itemId ? state.detailById[itemId] ?? null : null));
  const movements = useInventoryStore((state) => (itemId ? state.movementsByItemId[itemId] ?? [] : []));
  const detailError = useInventoryStore((state) => (itemId ? state.detailErrorById[itemId] ?? null : null));
  const detailStatus = useInventoryStore((state) => (itemId ? state.detailStatusById[itemId] ?? "idle" : "idle"));
  const detailUpdatedAt = useInventoryStore((state) => (itemId ? state.detailUpdatedAtById[itemId] ?? null : null));
  const movementError = useInventoryStore((state) => (itemId ? state.movementsErrorByItemId[itemId] ?? null : null));
  const movementStatus = useInventoryStore((state) => (itemId ? state.movementsStatusByItemId[itemId] ?? "idle" : "idle"));
  const movementUpdatedAt = useInventoryStore((state) => (itemId ? state.movementsUpdatedAtByItemId[itemId] ?? null : null));
  const itemCacheState =
    detailStatus === "loading"
      ? "refreshing"
      : item
        ? isCacheStale(detailUpdatedAt, CACHE_TTL_MS.inventoryDetail)
          ? "stale"
          : "cached"
        : "empty";
  const movementCacheState =
    movementStatus === "loading"
      ? "refreshing"
      : movements.length
        ? isCacheStale(movementUpdatedAt, CACHE_TTL_MS.stockMovements)
          ? "stale"
          : "cached"
        : "empty";

  const loadItem = React.useCallback(async () => {
    if (!session?.business_id || !itemId) {
      setError("Missing business or inventory item context.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      setError(null);
      const [nextItem, stockMovements] = await Promise.all([
        ensureInventoryDetail(session.business_id, itemId, true),
        ensureStockMovements(session.business_id, itemId, true),
      ]);
      setForm({
        name: nextItem.name,
        sku: nextItem.sku ?? "",
        hsn_code: nextItem.hsn_code ?? "",
        description: nextItem.description ?? "",
        unit: nextItem.unit,
        gst_rate: String(nextItem.gst_rate),
        purchase_price: String(nextItem.purchase_price),
        selling_price: String(nextItem.selling_price),
        low_stock_threshold: String(nextItem.low_stock_threshold),
      });
      void stockMovements;
    } catch (loadError: any) {
      setError(
        loadError?.response?.data?.error?.message ??
          loadError?.response?.data?.message ??
          loadError?.message ??
          "Unable to load the inventory item.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [ensureInventoryDetail, ensureStockMovements, itemId, session?.business_id]);

  React.useEffect(() => {
    void loadItem();
  }, [loadItem]);

  function updateField<Key extends keyof EditFormState>(field: Key, value: EditFormState[Key]) {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  }

  async function onSubmit() {
    if (!session?.business_id || !itemId || !form) {
      setError("Missing business or inventory item context.");
      return;
    }

    if (form.name.trim().length < 2) {
      setError("Item name must be at least 2 characters.");
      return;
    }

    const gstRate = Number(form.gst_rate);
    const purchasePrice = Number(form.purchase_price);
    const sellingPrice = Number(form.selling_price);
    const lowStockThreshold = Number(form.low_stock_threshold);

    if ([gstRate, purchasePrice, sellingPrice, lowStockThreshold].some((value) => Number.isNaN(value) || value < 0)) {
      setError("GST, prices, and threshold must be valid non-negative numbers.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const updated = await updateInventoryItem(session.business_id, itemId, {
        name: form.name.trim(),
        sku: normalizeOptional(form.sku),
        hsn_code: normalizeOptional(form.hsn_code),
        description: normalizeOptional(form.description),
        unit: form.unit.trim(),
        gst_rate: gstRate,
        purchase_price: purchasePrice,
        selling_price: sellingPrice,
        low_stock_threshold: lowStockThreshold,
      });

      showToast(`${updated.name} was updated successfully.`);
      setTimeout(() => {
        router.replace({
          pathname: "/(app)/inventory",
          params: {
            refresh: String(Date.now()),
            toast: `${updated.name} updated successfully.`,
          },
        });
      }, 550);
    } catch (submitError: any) {
      setError(
        submitError?.response?.data?.error?.message ??
          submitError?.response?.data?.message ??
          submitError?.message ??
          "Unable to update the inventory item.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onDelete() {
    if (!session?.business_id || !itemId || !form) {
      setError("Missing business or inventory item context.");
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await deleteInventoryItem(session.business_id, itemId);
      setIsDeleteDialogOpen(false);
      showToast(`${form.name} deleted successfully.`);
      setTimeout(() => {
        router.replace({
          pathname: "/(app)/inventory",
          params: {
            refresh: String(Date.now()),
            toast: `${form.name} deleted successfully.`,
          },
        });
      }, 450);
    } catch (deleteError: any) {
      setError(
        deleteError?.response?.data?.error?.message ??
          deleteError?.response?.data?.message ??
          deleteError?.message ??
          "Unable to delete the inventory item.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading || !form) {
    return <FormScreenSkeleton rowCount={4} showActionCard />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-6 pb-28 pt-4">
        <View className="gap-6">
          <SubpageHeader
            backHref="/(app)/inventory"
            eyebrow="Inventory"
            subtitle="Update the commercial details of an existing item without touching its movement history."
            title="Edit item"
          />
          <View className="gap-2">
            <DevCacheIndicator
              label="inventory-item"
              state={itemCacheState}
              detail={formatCacheAge(detailUpdatedAt)}
            />
            <DevCacheIndicator
              label="stock-history"
              state={movementCacheState}
              detail={formatCacheAge(movementUpdatedAt)}
            />
          </View>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Item details</CardTitle>
              <CardDescription>Keep the product identity and tax settings accurate.</CardDescription>
            </CardHeader>
            <CardContent className="gap-5">
              <Field label="Item name">
                <Input value={form.name} onChangeText={(value) => updateField("name", value)} />
              </Field>

              <View className="flex-row gap-4">
                <Field className="flex-1" label="SKU">
                  <Input value={form.sku} onChangeText={(value) => updateField("sku", value)} />
                </Field>
                <Field className="flex-1" label="HSN code">
                  <Input value={form.hsn_code} onChangeText={(value) => updateField("hsn_code", value)} />
                </Field>
              </View>

              <Field label="Description">
                <Textarea
                  className="min-h-[110px] rounded-[22px] border-border/70 bg-muted/35 px-4 py-3"
                  value={form.description}
                  onChangeText={(value) => updateField("description", value)}
                />
              </Field>

              <Field label="Unit">
                <View className="flex-row flex-wrap gap-2">
                  {INVENTORY_UNITS.map((unit) => (
                    <ChoiceChip
                      key={unit}
                      label={unit}
                      selected={form.unit === unit}
                      onPress={() => updateField("unit", unit)}
                    />
                  ))}
                </View>
              </Field>

              <Field label="GST rate">
                <View className="flex-row flex-wrap gap-2">
                  {GST_RATES.map((rate) => (
                    <ChoiceChip
                      key={String(rate)}
                      label={`${rate}%`}
                      selected={form.gst_rate === String(rate)}
                      onPress={() => updateField("gst_rate", String(rate))}
                    />
                  ))}
                </View>
              </Field>
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Pricing and threshold</CardTitle>
              <CardDescription>Update prices and reorder thresholds used for this item.</CardDescription>
            </CardHeader>
            <CardContent className="gap-5">
              <View className="flex-row gap-4">
                <Field className="flex-1" label="Purchase price">
                  <Input value={form.purchase_price} keyboardType="decimal-pad" onChangeText={(value) => updateField("purchase_price", value)} />
                </Field>
                <Field className="flex-1" label="Selling price">
                  <Input value={form.selling_price} keyboardType="decimal-pad" onChangeText={(value) => updateField("selling_price", value)} />
                </Field>
              </View>

              <Field label="Low stock threshold">
                <Input
                  value={form.low_stock_threshold}
                  keyboardType="decimal-pad"
                  onChangeText={(value) => updateField("low_stock_threshold", value)}
                />
              </Field>
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Recent stock movements</CardTitle>
              <CardDescription>Latest manual or linked movements for this item.</CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              {movements.length ? (
                movements.slice(0, 6).map((movement) => (
                  <View
                    key={movement.id}
                    className="rounded-[24px] border border-border/70 bg-background px-4 py-4">
                    <View className="flex-row items-center justify-between gap-4">
                      <View className="flex-1 gap-1">
                        <Text className="font-semibold text-foreground">
                          {movement.direction === "in" ? "Stock in" : "Stock out"} {movement.quantity} {movement.item_unit ?? form.unit}
                        </Text>
                        <Text className="text-sm text-muted-foreground">
                          {movement.reference_type ?? "manual"} | {formatShortDate(movement.created_at)}
                        </Text>
                      </View>
                      <Text className="font-semibold text-foreground">
                        {movement.unit_price == null ? "-" : formatCurrency(movement.unit_price)}
                      </Text>
                    </View>
                    {movement.notes ? (
                      <Text className="mt-3 text-sm leading-6 text-muted-foreground">{movement.notes}</Text>
                    ) : null}
                  </View>
                ))
              ) : (
                <View className="rounded-[24px] border border-dashed border-border/70 bg-muted/20 px-4 py-6">
                  <Text className="text-center text-sm leading-6 text-muted-foreground">
                    No stock movement history is available for this item yet.
                  </Text>
                </View>
              )}
            </CardContent>
          </Card>

          {error || detailError || movementError ? (
            <View className="rounded-[24px] border border-destructive/30 bg-destructive/10 px-4 py-4">
              <Text className="text-sm text-destructive">{error ?? detailError ?? movementError}</Text>
            </View>
          ) : null}

          <Button className="mb-4 h-14 rounded-[24px]" disabled={isSubmitting} onPress={onSubmit}>
            {isSubmitting ? (
              <>
                <ActivityIndicator color="#ffffff" />
                <Text className="text-base">Saving changes...</Text>
              </>
            ) : (
              <>
                <Icon as={PenLine} className="text-primary-foreground" size={18} />
                <Text className="text-base">Save item changes</Text>
              </>
            )}
          </Button>

          <Button
            className="mb-4 h-14 rounded-[24px]"
            variant="destructive"
            disabled={isDeleting}
            onPress={() => setIsDeleteDialogOpen(true)}>
            {isDeleting ? (
              <>
                <ActivityIndicator color="#ffffff" />
                <Text className="text-base">Deleting item...</Text>
              </>
            ) : (
              <>
                <Icon as={Trash2} className="text-white" size={18} />
                <Text className="text-base">Delete item</Text>
              </>
            )}
          </Button>
        </View>
      </ScrollView>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[28px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete inventory item?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the item record from inventory. Continue only if you are sure this item should no longer exist.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Text>Cancel</Text>
            </AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onPress={onDelete}>
              <Text className="text-white">Delete item</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

function normalizeOptional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
