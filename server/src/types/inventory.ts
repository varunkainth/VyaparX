export interface CreateInventoryInput {
    business_id: string;
    created_by: string;
    name: string;
    sku?: string;
    hsn_code?: string;
    description?: string;
    unit: string;
    gst_rate: number;
    purchase_price: number;
    selling_price: number;
    low_stock_threshold?: number;
    opening_stock?: number;
    opening_stock_note?: string;
}

export type CreateInventoryBody = Omit<CreateInventoryInput, "business_id" | "created_by">;

export interface AdjustInventoryStockInput {
    businessId: string;
    itemId: string;
    quantity: number;
    direction: "in" | "out";
    unit_price?: number;
    notes?: string;
    created_by: string;
}

export type AdjustInventoryStockBody = Pick<
    AdjustInventoryStockInput,
    "quantity" | "direction" | "unit_price" | "notes"
>;

export interface InventoryItemParams {
    business_id: string;
    item_id: string;
    [key: string]: string;
}

export interface InventoryListQuery {
    include_inactive?: "true" | "false";
}
