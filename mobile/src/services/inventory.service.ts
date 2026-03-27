import apiClient from "../lib/api-client";
import type { ApiResponse } from "../types/auth";
import type {
  AdjustInventoryStockBody,
  CreateInventoryBody,
  InventoryItem,
  InventoryListQuery,
  InventoryStockAdjustmentResult,
  StockMovement,
} from "../types/inventory";

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

function transformInventoryItem(item: InventoryItem): InventoryItem {
  return {
    ...item,
    gst_rate: toNumber(item.gst_rate),
    purchase_price: toNumber(item.purchase_price),
    selling_price: toNumber(item.selling_price),
    current_stock: toNumber(item.current_stock),
    low_stock_threshold: toNumber(item.low_stock_threshold),
  };
}

function transformStockMovement(movement: StockMovement): StockMovement {
  return {
    ...movement,
    quantity: toNumber(movement.quantity),
    unit_price: movement.unit_price == null ? null : toNumber(movement.unit_price),
  };
}

export const inventoryService = {
  async listInventoryItems(
    business_id: string,
    params?: InventoryListQuery,
  ): Promise<InventoryItem[]> {
    const response = await apiClient.get<ApiResponse<InventoryItem[]>>(
      `/api/v1/businesses/${business_id}/inventory-items`,
      { params },
    );
    return response.data.data.map(transformInventoryItem);
  },

  async createInventoryItem(
    business_id: string,
    payload: CreateInventoryBody,
  ): Promise<InventoryItem> {
    const response = await apiClient.post<ApiResponse<InventoryItem>>(
      `/api/v1/businesses/${business_id}/inventory-items`,
      payload,
    );
    return transformInventoryItem(response.data.data);
  },

  async getInventoryItem(
    business_id: string,
    item_id: string,
  ): Promise<InventoryItem> {
    const response = await apiClient.get<ApiResponse<InventoryItem>>(
      `/api/v1/businesses/${business_id}/inventory-items/${item_id}`,
    );
    return transformInventoryItem(response.data.data);
  },

  async updateInventoryItem(
    business_id: string,
    item_id: string,
    payload: Partial<CreateInventoryBody>,
  ): Promise<InventoryItem> {
    const response = await apiClient.patch<ApiResponse<InventoryItem>>(
      `/api/v1/businesses/${business_id}/inventory-items/${item_id}`,
      payload,
    );
    return transformInventoryItem(response.data.data);
  },

  async adjustInventoryStock(
    business_id: string,
    item_id: string,
    payload: AdjustInventoryStockBody,
  ): Promise<InventoryStockAdjustmentResult> {
    const response = await apiClient.post<
      ApiResponse<InventoryStockAdjustmentResult>
    >(
      `/api/v1/businesses/${business_id}/inventory-items/${item_id}/adjust-stock`,
      payload,
    );
    return response.data.data;
  },

  async deleteInventoryItem(
    business_id: string,
    item_id: string,
  ): Promise<InventoryItem> {
    const response = await apiClient.delete<ApiResponse<InventoryItem>>(
      `/api/v1/businesses/${business_id}/inventory-items/${item_id}`,
    );
    return transformInventoryItem(response.data.data);
  },

  async listStockMovements(
    business_id: string,
    params?: { item_id?: string },
  ): Promise<StockMovement[]> {
    const response = await apiClient.get<ApiResponse<StockMovement[]>>(
      `/api/v1/businesses/${business_id}/stock-movements`,
      { params },
    );
    return response.data.data.map(transformStockMovement);
  },
};
