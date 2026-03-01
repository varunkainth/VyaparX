import pool from "../config/db";

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

      name VARCHAR(200) NOT NULL,
      sku VARCHAR(100),

      hsn_code VARCHAR(8),
      description TEXT,

      unit VARCHAR(20) NOT NULL,

      gst_rate NUMERIC(5,2) NOT NULL CHECK (gst_rate >= 0),

      purchase_price NUMERIC(15,2) NOT NULL CHECK (purchase_price >= 0),
      selling_price NUMERIC(15,2) NOT NULL CHECK (selling_price >= 0),

      current_stock NUMERIC(10,3) DEFAULT 0 CHECK (current_stock >= 0),

      low_stock_threshold NUMERIC(10,3) DEFAULT 0 CHECK (low_stock_threshold >= 0),

      is_active BOOLEAN DEFAULT true,

      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),

      UNIQUE (business_id, sku)
    );
  `);

  console.log("Inventory items table created successfully");
  process.exit();
}

run();