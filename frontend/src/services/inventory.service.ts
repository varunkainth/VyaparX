import apiClient from "@/lib/api-client";
import type {
  InventoryItem,
  CreateInventoryInput,
  UpdateInventoryInput,
  AdjustStockInput,
  ListInventoryQuery,
  StockMovement,
} from "@/types/inventory";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// Transform API response to ensure numeric fields are numbers, not strings
function transformInventoryItem(item: any): InventoryItem {
  return {
    ...item,
    gst_rate: typeof item.gst_rate === 'string' ? parseFloat(item.gst_rate) : item.gst_rate,
    purchase_price: typeof item.purchase_price === 'string' ? parseFloat(item.purchase_price) : item.purchase_price,
    selling_price: typeof item.selling_price === 'string' ? parseFloat(item.selling_price) : item.selling_price,
    current_stock: typeof item.current_stock === 'string' ? parseFloat(item.current_stock) : item.current_stock,
    low_stock_threshold: typeof item.low_stock_threshold === 'string' ? parseFloat(item.low_stock_threshold) : item.low_stock_threshold,
  };
}

export const inventoryService = {
  async listItems(businessId: string, query?: ListInventoryQuery): Promise<InventoryItem[]> {
    const params = new URLSearchParams();
    if (query?.include_inactive) {
      params.append("include_inactive", "true");
    }
    
    const url = `/api/v1/businesses/${businessId}/inventory-items${params.toString() ? `?${params.toString()}` : ""}`;
    const response = await apiClient.get<ApiResponse<any[]>>(url);
    return response.data.data.map(transformInventoryItem);
  },

  async getItem(businessId: string, itemId: string): Promise<InventoryItem> {
    const response = await apiClient.get<ApiResponse<any>>(
      `/api/v1/businesses/${businessId}/inventory-items/${itemId}`
    );
    return transformInventoryItem(response.data.data);
  },

  async createItem(businessId: string, data: CreateInventoryInput): Promise<InventoryItem> {
    const response = await apiClient.post<ApiResponse<any>>(
      `/api/v1/businesses/${businessId}/inventory-items`,
      data
    );
    return transformInventoryItem(response.data.data);
  },

  async updateItem(
    businessId: string,
    itemId: string,
    data: UpdateInventoryInput
  ): Promise<InventoryItem> {
    const response = await apiClient.patch<ApiResponse<any>>(
      `/api/v1/businesses/${businessId}/inventory-items/${itemId}`,
      data
    );
    return transformInventoryItem(response.data.data);
  },

  async adjustStock(
    businessId: string,
    itemId: string,
    data: AdjustStockInput
  ): Promise<InventoryItem> {
    const response = await apiClient.post<ApiResponse<any>>(
      `/api/v1/businesses/${businessId}/inventory-items/${itemId}/adjust-stock`,
      data
    );
    return transformInventoryItem(response.data.data);
  },

  async deleteItem(businessId: string, itemId: string): Promise<void> {
    await apiClient.delete(
      `/api/v1/businesses/${businessId}/inventory-items/${itemId}`
    );
  },

  async listStockMovements(businessId: string, itemId?: string): Promise<StockMovement[]> {
    const params = itemId ? `?item_id=${itemId}` : "";
    const response = await apiClient.get<ApiResponse<any[]>>(
      `/api/v1/businesses/${businessId}/stock-movements${params}`
    );
    return response.data.data.map((movement: any) => ({
      ...movement,
      quantity: typeof movement.quantity === 'string' ? parseFloat(movement.quantity) : movement.quantity,
      unit_price: movement.unit_price && typeof movement.unit_price === 'string' 
        ? parseFloat(movement.unit_price) 
        : movement.unit_price,
    }));
  },
};
