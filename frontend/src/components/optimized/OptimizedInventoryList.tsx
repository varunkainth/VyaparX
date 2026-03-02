"use client"

import { useMemo } from "react";
import { useInventoryItems } from "@/hooks/queries/useInventory";
import { useBusinessStore } from "@/store/useBusinessStore";
import { VirtualList } from "@/components/ui/virtual-list";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListSkeleton } from "@/components/ui/skeleton-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { Package, AlertTriangle } from "lucide-react";
import type { InventoryItem } from "@/types/inventory";

interface OptimizedInventoryListProps {
  searchQuery?: string;
  showLowStock?: boolean;
  includeInactive?: boolean;
  onItemClick: (itemId: string) => void;
}

export function OptimizedInventoryList({
  searchQuery = "",
  showLowStock = false,
  includeInactive = false,
  onItemClick,
}: OptimizedInventoryListProps) {
  const { currentBusiness } = useBusinessStore();
  
  const { data, isLoading, error } = useInventoryItems(currentBusiness?.id, {
    include_inactive: includeInactive,
  });

  const filteredItems = useMemo(() => {
    if (!data) return [];

    return data.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.hsn_code?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesLowStock = !showLowStock || item.current_stock < item.low_stock_threshold;

      return matchesSearch && matchesLowStock;
    });
  }, [data, searchQuery, showLowStock]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const renderInventoryItem = (item: InventoryItem, index: number) => (
    <Card className="mb-2 cursor-pointer" onClick={() => onItemClick(item.id)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium truncate">{item.name}</span>
              {item.current_stock < item.low_stock_threshold && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Low Stock
                </Badge>
              )}
              {!item.is_active && <Badge variant="secondary">Inactive</Badge>}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
              {item.sku && <span>SKU: {item.sku}</span>}
              {item.hsn_code && <span>HSN: {item.hsn_code}</span>}
              <span>Unit: {item.unit}</span>
              <span>GST: {item.gst_rate}%</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Stock</p>
            <p
              className={`font-semibold text-lg ${
                item.current_stock < item.low_stock_threshold ? "text-orange-600" : ""
              }`}
            >
              {item.current_stock} {item.unit}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(item.selling_price)}/{item.unit}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return <ListSkeleton count={5} type="inventory" />;
  }

  if (error) {
    return (
      <EmptyState
        icon={Package}
        title="Error loading inventory"
        description="There was an error loading your inventory. Please try again."
      />
    );
  }

  if (filteredItems.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No items found"
        description={
          searchQuery || showLowStock
            ? "Try adjusting your filters"
            : "Get started by adding your first inventory item"
        }
      />
    );
  }

  return (
    <VirtualList
      items={filteredItems}
      itemHeight={100}
      containerHeight={600}
      renderItem={renderInventoryItem}
      overscan={5}
      className="w-full"
    />
  );
}
