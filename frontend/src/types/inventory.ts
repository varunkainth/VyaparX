export interface InventoryItem {
  id: string;
  business_id: string;
  name: string;
  sku?: string | null;
  hsn_code?: string | null;
  description?: string | null;
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

export interface CreateInventoryInput {
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

export interface UpdateInventoryInput {
  name?: string;
  sku?: string;
  hsn_code?: string;
  description?: string;
  unit?: string;
  gst_rate?: number;
  purchase_price?: number;
  selling_price?: number;
  low_stock_threshold?: number;
}

export interface AdjustStockInput {
  quantity: number;
  direction: "in" | "out";
  unit_price?: number;
  notes?: string;
}

export interface ListInventoryQuery {
  include_inactive?: boolean;
}

// Common units for Indian businesses
export const INVENTORY_UNITS = [
  "PCS", // Pieces
  "KG", // Kilogram
  "GM", // Gram
  "LTR", // Liter
  "ML", // Milliliter
  "MTR", // Meter
  "CM", // Centimeter
  "SQM", // Square Meter
  "SQFT", // Square Feet
  "BOX", // Box
  "PKT", // Packet
  "BAG", // Bag
  "BTL", // Bottle
  "CAN", // Can
  "CTN", // Carton
  "DOZ", // Dozen
  "SET", // Set
  "PAIR", // Pair
  "ROLL", // Roll
  "BUNDLE", // Bundle
] as const;

// Common GST rates in India
export const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28] as const;

export interface StockMovement {
  id: string;
  business_id: string;
  item_id: string;
  item_name: string;
  item_unit: string;
  movement_type: string;
  quantity: number;
  direction: "in" | "out";
  reference_type: "manual" | "invoice" | "purchase_order" | "payment" | null;
  reference_id: string | null;
  unit_price: number | null;
  notes: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_by_email: string | null;
  created_at: string;
}
