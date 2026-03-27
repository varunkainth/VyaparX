import * as React from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowDown, ArrowUp, PackageSearch, Search } from "lucide-react-native";

import { FullScreenLoader } from "@/components/full-screen-loader";
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
import { formatCurrency } from "@/lib/formatters";
import { inventoryService } from "@/services/inventory.service";
import { useAuthStore } from "@/store/auth-store";
import type { InventoryItem } from "@/types/inventory";

export default function InventoryUpdateStockScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { session } = useAuthStore();
  const { message, showToast } = useTimedToast();
  const [items, setItems] = React.useState<InventoryItem[]>([]);
  const [selectedItemId, setSelectedItemId] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [quantity, setQuantity] = React.useState("");
  const [direction, setDirection] = React.useState<"in" | "out">("in");
  const [unitPrice, setUnitPrice] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isPickerOpen, setIsPickerOpen] = React.useState(false);

  const selectedIdFromParams = typeof params.id === "string" ? params.id : null;

  const loadItems = React.useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!session?.business_id) {
        setError("No active business found for inventory updates.");
        setItems([]);
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
        const nextItems = await inventoryService.listInventoryItems(session.business_id);
        setItems(nextItems);

        if (selectedIdFromParams && nextItems.some((item) => item.id === selectedIdFromParams)) {
          setSelectedItemId(selectedIdFromParams);
        } else if (!selectedItemId && nextItems.length) {
          setSelectedItemId(nextItems[0].id);
        }

        if (selectedItemId && !nextItems.some((item) => item.id === selectedItemId)) {
          setSelectedItemId(nextItems[0]?.id ?? null);
        }
      } catch (loadError: any) {
        setError(
          loadError?.response?.data?.error?.message ??
            loadError?.response?.data?.message ??
            loadError?.message ??
            "Unable to load inventory items for stock adjustment.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedIdFromParams, selectedItemId, session?.business_id],
  );

  React.useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const filteredItems = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return items;
    }

    return items.filter((item) => {
      return (
        item.name.toLowerCase().includes(query) ||
        item.sku?.toLowerCase().includes(query) ||
        item.hsn_code?.toLowerCase().includes(query)
      );
    });
  }, [items, searchQuery]);

  const selectedItem = React.useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId],
  );

  async function onSubmit() {
    if (!session?.business_id) {
      setError("No active business found for stock adjustment.");
      return;
    }

    if (!selectedItem) {
      setError("Choose an inventory item first.");
      return;
    }

    const parsedQuantity = Number(quantity);
    const parsedUnitPrice = unitPrice.trim() ? Number(unitPrice) : undefined;

    if (Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
      setError("Quantity must be a valid number greater than zero.");
      return;
    }

    if (parsedUnitPrice != null && (Number.isNaN(parsedUnitPrice) || parsedUnitPrice < 0)) {
      setError("Unit price must be a valid non-negative number.");
      return;
    }

    if (direction === "out" && parsedQuantity > selectedItem.current_stock) {
      setError("You cannot reduce more stock than is currently available.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await inventoryService.adjustInventoryStock(session.business_id, selectedItem.id, {
        quantity: parsedQuantity,
        direction,
        unit_price: parsedUnitPrice,
        notes: normalizeOptional(notes),
      });

      showToast(`${selectedItem.name} updated to ${result.current_stock} ${selectedItem.unit}.`);
      setQuantity("");
      setUnitPrice("");
      setNotes("");
      await loadItems("refresh");
      setTimeout(() => {
        router.replace({
          pathname: "/(app)/inventory",
          params: {
            refresh: String(Date.now()),
            toast: `${selectedItem.name} stock updated.`,
          },
        });
      }, 600);
    } catch (submitError: any) {
      setError(
        submitError?.response?.data?.error?.message ??
          submitError?.response?.data?.message ??
          submitError?.message ??
          "Unable to update stock.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <FullScreenLoader label="Loading inventory items" />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-6 pb-28 pt-4"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadItems("refresh")} />}>
        <View className="gap-6">
          <SubpageHeader
            backHref="/(app)/inventory"
            eyebrow="Inventory"
            subtitle="Select an item, choose stock in or stock out, and post a manual adjustment."
            title="Update stock"
          />

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Select item</CardTitle>
              <CardDescription>Search the inventory list and choose the item you want to adjust.</CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              <Pressable
                className="rounded-[24px] border border-border/70 bg-background px-4 py-4"
                onPress={() => setIsPickerOpen(true)}>
                <Text className="text-sm text-muted-foreground">Selected item</Text>
                <Text className="mt-2 text-base font-semibold text-foreground">
                  {selectedItem ? selectedItem.name : "Choose inventory item"}
                </Text>
                <Text className="mt-1 text-sm text-muted-foreground">
                  {selectedItem
                    ? `${selectedItem.current_stock} ${selectedItem.unit} available`
                    : "Open the picker to search by name, SKU, or HSN."}
                </Text>
              </Pressable>
            </CardContent>
          </Card>

          {selectedItem ? (
            <Card className="rounded-[28px]">
              <CardHeader>
                <CardTitle>Selected item</CardTitle>
                <CardDescription>Review current stock before posting the adjustment.</CardDescription>
              </CardHeader>
              <CardContent className="gap-3">
                <View className="rounded-[24px] border border-border/70 bg-background px-4 py-4">
                  <Text className="text-lg font-semibold text-foreground">{selectedItem.name}</Text>
                  <Text className="mt-1 text-sm text-muted-foreground">
                    {selectedItem.current_stock} {selectedItem.unit} available | Threshold {selectedItem.low_stock_threshold} {selectedItem.unit}
                  </Text>
                  <Text className="mt-3 text-sm text-muted-foreground">
                    Selling {formatCurrency(selectedItem.selling_price)} | Purchase {formatCurrency(selectedItem.purchase_price)}
                  </Text>
                </View>
              </CardContent>
            </Card>
          ) : null}

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Adjustment details</CardTitle>
              <CardDescription>Record the movement direction, quantity, and optional pricing note.</CardDescription>
            </CardHeader>
            <CardContent className="gap-5">
              <Field label="Direction">
                <View className="flex-row gap-3">
                  <DirectionChip
                    icon={ArrowUp}
                    label="Stock in"
                    selected={direction === "in"}
                    onPress={() => setDirection("in")}
                  />
                  <DirectionChip
                    icon={ArrowDown}
                    label="Stock out"
                    selected={direction === "out"}
                    onPress={() => setDirection("out")}
                  />
                </View>
              </Field>

              <View className="flex-row gap-4">
                <Field className="flex-1" label="Quantity">
                  <Input
                    keyboardType="decimal-pad"
                    placeholder="0"
                    value={quantity}
                    onChangeText={setQuantity}
                  />
                </Field>
                <Field className="flex-1" label="Unit price">
                  <Input
                    keyboardType="decimal-pad"
                    placeholder="Optional"
                    value={unitPrice}
                    onChangeText={setUnitPrice}
                  />
                </Field>
              </View>

              <Field label="Notes">
                <Textarea
                  className="min-h-[110px] rounded-[22px] border-border/70 bg-muted/35 px-4 py-3"
                  placeholder="Optional reason for this stock movement"
                  value={notes}
                  onChangeText={setNotes}
                />
              </Field>
            </CardContent>
          </Card>

          {error ? (
            <MessageCard
              icon={PackageSearch}
              text={error}
              tone="border-destructive/30 bg-destructive/10"
              textTone="text-destructive"
            />
          ) : null}

          <Button className="mb-4 h-14 rounded-[24px]" disabled={isSubmitting || !selectedItem} onPress={onSubmit}>
            {isSubmitting ? (
              <>
                <ActivityIndicator color="#ffffff" />
                <Text className="text-base">Updating stock...</Text>
              </>
            ) : (
              <Text className="text-base">Post stock adjustment</Text>
            )}
          </Button>
        </View>
      </ScrollView>
      <Dialog open={isPickerOpen} onOpenChange={setIsPickerOpen}>
        <DialogContent className="max-w-[420px] rounded-[28px]">
          <DialogHeader>
            <DialogTitle>Choose inventory item</DialogTitle>
            <DialogDescription>Search the full inventory list and pick one item for this adjustment.</DialogDescription>
          </DialogHeader>
          <View className="gap-4">
            <View className="relative">
              <View className="absolute left-4 top-3.5 z-10">
                <Icon as={Search} className="text-muted-foreground" size={18} />
              </View>
              <Input
                className="pl-11"
                placeholder="Search by name, SKU, or HSN code"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <ScrollView className="max-h-[360px]">
              <View className="gap-3">
                {filteredItems.length ? (
                  filteredItems.map((item) => {
                    const selected = item.id === selectedItemId;
                    return (
                      <Pressable
                        key={item.id}
                        className={`rounded-[24px] border px-4 py-4 ${selected ? "border-primary bg-primary/10" : "border-border/70 bg-background"}`}
                        onPress={() => {
                          setSelectedItemId(item.id);
                          setIsPickerOpen(false);
                        }}>
                        <View className="flex-row items-center justify-between gap-4">
                          <View className="flex-1 gap-1">
                            <Text className="font-semibold text-foreground">{item.name}</Text>
                            <Text className="text-sm text-muted-foreground">
                              {item.current_stock} {item.unit} in stock
                              {item.sku ? ` | SKU ${item.sku}` : ""}
                            </Text>
                          </View>
                          <Text className="font-semibold text-foreground">{formatCurrency(item.selling_price)}</Text>
                        </View>
                      </Pressable>
                    );
                  })
                ) : (
                  <View className="rounded-[24px] border border-dashed border-border/70 bg-muted/20 px-4 py-6">
                    <Text className="text-center text-sm leading-6 text-muted-foreground">
                      No items matched the current search.
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </DialogContent>
      </Dialog>
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

function DirectionChip({
  icon,
  label,
  onPress,
  selected,
}: {
  icon: typeof ArrowUp;
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      className={`flex-1 flex-row items-center justify-center gap-2 rounded-[22px] border px-4 py-3 ${selected ? "border-primary bg-primary" : "border-border/70 bg-background"}`}
      onPress={onPress}>
      <Icon as={icon} className={selected ? "text-primary-foreground" : "text-foreground"} size={16} />
      <Text className={selected ? "text-primary-foreground" : "text-foreground"}>{label}</Text>
    </Pressable>
  );
}

function MessageCard({
  icon,
  text,
  textTone,
  tone,
}: {
  icon: typeof PackageSearch;
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

function normalizeOptional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
