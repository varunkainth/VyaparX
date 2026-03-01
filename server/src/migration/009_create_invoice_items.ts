import pool from "../config/db";

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      item_id UUID REFERENCES inventory_items(id),

      item_name VARCHAR(200) NOT NULL,
      hsn_code VARCHAR(8),
      description TEXT,

      unit VARCHAR(20) NOT NULL,
      quantity NUMERIC(10,3) NOT NULL CHECK (quantity > 0),

      unit_price NUMERIC(15,2) NOT NULL CHECK (unit_price >= 0),

      discount_pct NUMERIC(5,2) DEFAULT 0 CHECK (discount_pct >= 0),
      discount_amount NUMERIC(15,2) DEFAULT 0 CHECK (discount_amount >= 0),

      taxable_value NUMERIC(15,2) NOT NULL CHECK (taxable_value >= 0),

      gst_rate NUMERIC(5,2) NOT NULL CHECK (gst_rate >= 0),

      cgst_rate NUMERIC(5,2) DEFAULT 0 CHECK (cgst_rate >= 0),
      sgst_rate NUMERIC(5,2) DEFAULT 0 CHECK (sgst_rate >= 0),
      igst_rate NUMERIC(5,2) DEFAULT 0 CHECK (igst_rate >= 0),

      cgst_amount NUMERIC(15,2) DEFAULT 0 CHECK (cgst_amount >= 0),
      sgst_amount NUMERIC(15,2) DEFAULT 0 CHECK (sgst_amount >= 0),
      igst_amount NUMERIC(15,2) DEFAULT 0 CHECK (igst_amount >= 0),

      total_amount NUMERIC(15,2) NOT NULL CHECK (total_amount >= 0),

      sort_order INTEGER DEFAULT 0
    );
  `);

  console.log("Invoice items table created successfully");
  process.exit();
}

run();