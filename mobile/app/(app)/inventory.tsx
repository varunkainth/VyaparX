import * as React from "react";
import { Pressable, RefreshControl, ScrollView, Switch, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  ChevronUp,
  IndianRupee,
  PackageCheck,
  PackageSearch,
  PenLine,
  Plus,
  ScanSearch,
  Search,
} from "lucide-react-native";

import { CollectionScreenSkeleton } from "@/components/screen-skeleton";
import { ToastBanner, useTimedToast } from "@/components/ui/toast-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DevCacheIndicator } from "@/components/dev-cache-indicator";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { CACHE_TTL_MS, formatCacheAge, isCacheStale } from "@/lib/cache-policy";
import { formatCompactNumber, formatCurrency } from "@/lib/formatters";
import { useAuthStore } from "@/store/auth-store";
import { getInventoryCacheKey, useInventoryStore } from "@/store/inventory-store";

export default function InventoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ refresh?: string; toast?: string }>();
  const { message, showToast } = useTimedToast();
  const { session } = useAuthStore();
  const ensureInventoryItems = useInventoryStore((state) => state.ensureInventoryItems);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [includeInactive, setIncludeInactive] = React.useState(false);
  const [showLowStockOnly, setShowLowStockOnly] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isFabOpen, setIsFabOpen] = React.useState(false);
  const handledRefreshRef = React.useRef<string | null>(null);
  const handledToastRef = React.useRef<string | null>(null);
  const hasFocusedOnceRef = React.useRef(false);
  const inventoryCache = useInventoryStore((state) =>
    session?.business_id ? state.cache[getInventoryCacheKey(session.business_id, includeInactive)] : undefined
  );
  const items = inventoryCache?.items ?? [];
  const cacheError = inventoryCache?.error ?? null;
  const inventoryCacheState =
    inventoryCache?.status === "loading"
      ? "refreshing"
      : items.length
        ? isCacheStale(inventoryCache?.updatedAt, CACHE_TTL_MS.inventoryList)
          ? "stale"
          : "cached"
        : "empty";

  const loadInventory = React.useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!session?.business_id) {
        setError("Select a business to view inventory.");
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
        await ensureInventoryItems(session.business_id, includeInactive, mode === "refresh");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load inventory.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [ensureInventoryItems, includeInactive, session?.business_id],
  );

  React.useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  useFocusEffect(
    React.useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }

      void loadInventory("refresh");
    }, [loadInventory]),
  );

  React.useEffect(() => {
    if (!params.toast || params.toast === handledToastRef.current) {
      return;
    }

    handledToastRef.current = params.toast;
    showToast(params.toast);
  }, [params.toast, showToast]);

  React.useEffect(() => {
    if (!params.refresh || params.refresh === handledRefreshRef.current) {
      return;
    }

    handledRefreshRef.current = params.refresh;
    void loadInventory("refresh");
  }, [loadInventory, params.refresh]);

  const filteredItems = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.sku?.toLowerCase().includes(query) ||
        item.hsn_code?.toLowerCase().includes(query);

      const isLowStock = item.current_stock < item.low_stock_threshold;
      const matchesStockFilter = !showLowStockOnly || isLowStock;

      return matchesQuery && matchesStockFilter;
    });
  }, [items, searchQuery, showLowStockOnly]);

  const stats = React.useMemo(() => {
    const lowStockItems = items.filter((item) => item.current_stock < item.low_stock_threshold);
    const activeItems = items.filter((item) => item.is_active);
    const stockValue = items.reduce((sum, item) => sum + item.current_stock * item.selling_price, 0);

    return {
      activeCount: activeItems.length,
      lowStockCount: lowStockItems.length,
      stockValue,
      totalCount: items.length,
    };
  }, [items]);

  if (isLoading) {
    return <CollectionScreenSkeleton metricCount={4} rowCount={5} />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="absolute -left-12 top-14 h-32 w-32 rounded-full bg-primary/8" />
      <View className="absolute right-0 top-44 h-28 w-28 rounded-full bg-secondary/70" />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-6 pb-28 pt-4"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadInventory("refresh")} />}>
        <View className="gap-6">
          <View className="gap-2">
            <DevCacheIndicator
              label="inventory"
              state={inventoryCacheState}
              detail={formatCacheAge(inventoryCache?.updatedAt)}
            />
            <Text className="text-sm uppercase tracking-[2px] text-muted-foreground">Inventory</Text>
            <Text className="text-3xl font-extrabold tracking-tight text-foreground">Stock control</Text>
            <Text className="text-base leading-6 text-muted-foreground">
              Live product visibility for current stock, low-stock pressure, and item pricing.
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-4">
            <MetricCard
              icon={Boxes}
              label="Tracked items"
              tone="bg-primary/10"
              value={String(stats.totalCount)}
            />
            <MetricCard
              icon={AlertTriangle}
              label="Low stock"
              tone="bg-amber-500/10"
              value={String(stats.lowStockCount)}
            />
            <MetricCard
              icon={PackageCheck}
              label="Active items"
              tone="bg-emerald-500/10"
              value={String(stats.activeCount)}
            />
            <MetricCard
              icon={IndianRupee}
              label="Stock value"
              tone="bg-sky-500/10"
              value={formatCompactNumber(stats.stockValue)}
            />
          </View>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Search items fast and focus on the stock that needs action.</CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              <View className="relative">
                <View className="absolute left-4 top-3.5 z-10">
                  <Icon as={Search} className="text-muted-foreground" size={18} />
                </View>
                <Input
                  className="pl-11"
                  onChangeText={setSearchQuery}
                  placeholder="Search by name, SKU, or HSN code"
                  returnKeyType="search"
                  value={searchQuery}
                />
              </View>

              <View className="gap-3 rounded-2xl border border-border/70 bg-background px-4 py-4">
                <FilterRow
                  description="Show inactive items together with active inventory."
                  label="Include inactive"
                  value={includeInactive}
                  onValueChange={setIncludeInactive}
                />
                <View className="h-px bg-border/70" />
                <FilterRow
                  description="Only keep items below their reorder threshold."
                  label="Low stock only"
                  value={showLowStockOnly}
                  onValueChange={setShowLowStockOnly}
                />
              </View>
            </CardContent>
          </Card>

          {error || cacheError ? (
            <Card className="rounded-[28px] border-destructive/20 bg-destructive/5">
              <CardContent className="gap-4 px-5 py-5">
                <View className="flex-row items-start gap-3">
                  <View className="rounded-2xl bg-destructive/10 px-3 py-3">
                    <Icon as={PackageSearch} className="text-destructive" size={18} />
                  </View>
                  <View className="flex-1 gap-1">
                    <Text className="font-semibold text-foreground">Inventory sync failed</Text>
                    <Text className="text-sm leading-6 text-muted-foreground">{error ?? cacheError}</Text>
                  </View>
                </View>
                <Button className="h-12 rounded-2xl" onPress={() => void loadInventory()}>
                  <Text>Retry inventory sync</Text>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Inventory items</CardTitle>
              <CardDescription>
                {filteredItems.length} results shown {searchQuery ? `for "${searchQuery.trim()}"` : "across this business"}.
              </CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              {filteredItems.length ? (
                filteredItems.map((item) => {
                  const isLowStock = item.current_stock < item.low_stock_threshold;

                  return (
                    <View
                      key={item.id}
                      className="gap-4 rounded-[24px] border border-border/70 bg-background px-4 py-4">
                      <View className="flex-row items-start gap-3">
                        <View
                          className={`rounded-2xl px-3 py-3 ${
                            isLowStock ? "bg-amber-500/10" : "bg-primary/10"
                          }`}>
                          <Icon as={isLowStock ? AlertTriangle : Boxes} className="text-primary" size={18} />
                        </View>
                        <View className="flex-1 gap-1">
                          <Text className="font-semibold text-foreground">{item.name}</Text>
                          <Text className="text-sm leading-5 text-muted-foreground">
                            {item.description?.trim() || "No description added yet."}
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row flex-wrap gap-2">
                        {isLowStock ? (
                          <Badge variant="destructive">
                            <Text>Low stock</Text>
                          </Badge>
                        ) : null}
                        {!item.is_active ? (
                          <Badge variant="secondary">
                            <Text>Inactive</Text>
                          </Badge>
                        ) : null}
                        {item.sku ? (
                          <Badge variant="outline">
                            <Text>SKU {item.sku}</Text>
                          </Badge>
                        ) : null}
                        {item.hsn_code ? (
                          <Badge variant="outline">
                            <Text>HSN {item.hsn_code}</Text>
                          </Badge>
                        ) : null}
                      </View>

                      <View className="flex-row flex-wrap gap-3">
                        <ItemStat label="In stock" value={`${item.current_stock} ${item.unit}`} valueClassName={isLowStock ? "text-amber-600" : ""} />
                        <ItemStat label="Threshold" value={`${item.low_stock_threshold} ${item.unit}`} />
                        <ItemStat label="Selling" value={formatCurrency(item.selling_price)} />
                        <ItemStat label="Purchase" value={formatCurrency(item.purchase_price)} />
                        <ItemStat label="GST" value={`${item.gst_rate}%`} />
                      </View>

                      <View className="flex-row gap-3">
                        <Button
                          className="h-11 flex-1 rounded-2xl"
                          variant="outline"
                          onPress={() =>
                            router.push({
                              pathname: "/(app)/inventory-edit",
                              params: { id: item.id },
                            })
                          }>
                          <Text>Edit item</Text>
                        </Button>
                        <Button
                          className="h-11 flex-1 rounded-2xl"
                          onPress={() =>
                            router.push({
                              pathname: "/(app)/inventory-update-stock",
                              params: { id: item.id },
                            })
                          }>
                          <Text>Update stock</Text>
                          <Icon as={ArrowUpRight} className="text-primary-foreground" size={16} />
                        </Button>
                      </View>
                    </View>
                  );
                })
              ) : (
                <EmptyInventoryState
                  hasFilters={Boolean(searchQuery.trim()) || showLowStockOnly}
                  includeInactive={includeInactive}
                  onReset={() => {
                    setSearchQuery("");
                    setShowLowStockOnly(false);
                  }}
                />
              )}
            </CardContent>
          </Card>
        </View>
      </ScrollView>
      <InventoryActionFab
        isOpen={isFabOpen}
        onCreate={() => {
          setIsFabOpen(false);
          router.push("/(app)/inventory-create");
        }}
        onToggle={() => setIsFabOpen((current) => !current)}
        onUpdateStock={() => {
          setIsFabOpen(false);
          router.push("/(app)/inventory-update-stock");
        }}
      />
      <ToastBanner message={message} variant="success" />
    </SafeAreaView>
  );
}

function MetricCard({
  icon,
  label,
  tone,
  value,
}: {
  icon: typeof Boxes;
  label: string;
  tone: string;
  value: string;
}) {
  return (
    <Card className="min-w-[140px] flex-1 rounded-[28px]">
      <CardContent className="gap-4 px-5 py-5">
        <View className="flex-row items-center justify-between gap-3">
          <View className={`rounded-2xl px-3 py-3 ${tone}`}>
            <Icon as={icon} className="text-foreground" size={18} />
          </View>
        </View>
        <View className="gap-1">
          <Text className="text-sm text-muted-foreground">{label}</Text>
          <Text className="text-2xl font-bold text-foreground">{value}</Text>
        </View>
      </CardContent>
    </Card>
  );
}

function FilterRow({
  description,
  label,
  onValueChange,
  value,
}: {
  description: string;
  label: string;
  onValueChange: (value: boolean) => void;
  value: boolean;
}) {
  return (
    <View className="flex-row items-center gap-4">
      <View className="flex-1 gap-1">
        <Text className="font-medium text-foreground">{label}</Text>
        <Text className="text-sm leading-5 text-muted-foreground">{description}</Text>
      </View>
      <Switch onValueChange={onValueChange} value={value} />
    </View>
  );
}

function ItemStat({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <View className="min-w-[100px] flex-1 rounded-2xl border border-border/70 bg-muted/25 px-3 py-3">
      <Text className="text-xs uppercase tracking-[1px] text-muted-foreground">{label}</Text>
      <Text className={`mt-2 font-semibold text-foreground ${valueClassName ?? ""}`}>{value}</Text>
    </View>
  );
}

function EmptyInventoryState({
  hasFilters,
  includeInactive,
  onReset,
}: {
  hasFilters: boolean;
  includeInactive: boolean;
  onReset: () => void;
}) {
  return (
    <View className="items-center gap-4 rounded-[28px] border border-dashed border-border/70 bg-muted/20 px-6 py-8">
      <View className="rounded-[24px] bg-primary/10 px-4 py-4">
        <Icon as={hasFilters ? ScanSearch : Boxes} className="text-primary" size={24} />
      </View>
      <View className="items-center gap-2">
        <Text className="text-lg font-semibold text-foreground">
          {hasFilters ? "No matching items found" : "No inventory items yet"}
        </Text>
        <Text className="text-center text-sm leading-6 text-muted-foreground">
          {hasFilters
            ? "Try a broader search or remove the low-stock filter to see more items."
            : includeInactive
              ? "This business has no inventory records, including inactive ones."
              : "Create inventory items from the web app or upcoming mobile flows to start tracking stock here."}
        </Text>
      </View>
      {hasFilters ? (
        <Button className="h-12 rounded-2xl px-5" variant="outline" onPress={onReset}>
          <Text>Clear filters</Text>
        </Button>
      ) : null}
    </View>
  );
}

function InventoryActionFab({
  isOpen,
  onCreate,
  onToggle,
  onUpdateStock,
}: {
  isOpen: boolean;
  onCreate: () => void;
  onToggle: () => void;
  onUpdateStock: () => void;
}) {
  return (
    <View className="absolute bottom-28 right-6 items-end gap-3">
      {isOpen ? (
        <>
          <ActionChip icon={PenLine} label="Update stock" onPress={onUpdateStock} />
          <ActionChip icon={Plus} label="Create item" onPress={onCreate} />
        </>
      ) : null}

      <Pressable
        accessibilityLabel={isOpen ? "Close inventory actions" : "Open inventory actions"}
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

function ActionChip({
  icon,
  label,
  onPress,
}: {
  icon: typeof Plus;
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
