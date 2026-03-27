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

export type CreateInventoryBody = Omit<
  CreateInventoryInput,
  "business_id" | "created_by"
>;

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

export interface InventoryItem {
  id: string;
  business_id: string;
  name: string;
  sku: string | null;
  hsn_code: string | null;
  description: string | null;
  unit: string;
  gst_rate: number;
  purchase_price: number;
  selling_price: number;
  current_stock: number;
  low_stock_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  business_id: string;
  item_id: string;
  movement_type: string;
  quantity: number;
  direction: "in" | "out";
  reference_type: string;
  reference_id: string | null;
  unit_price: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  item_name: string | null;
  item_unit: string | null;
  created_by_name: string | null;
  created_by_email: string | null;
}

export interface InventoryStockAdjustmentResult {
  item_id: string;
  previous_stock: number;
  current_stock: number;
}

export const INVENTORY_UNITS = [
  "PCS",
  "KG",
  "GM",
  "LTR",
  "ML",
  "MTR",
  "CM",
  "SQM",
  "SQFT",
  "BOX",
  "PKT",
  "BAG",
  "BTL",
  "CAN",
  "CTN",
  "DOZ",
  "SET",
  "PAIR",
  "ROLL",
  "BUNDLE",
] as const;

export const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28] as const;
