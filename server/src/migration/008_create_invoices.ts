import pool from "../config/db";

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      party_id UUID NOT NULL REFERENCES parties(id),

      invoice_type invoice_type NOT NULL,

      invoice_number VARCHAR(50) NOT NULL,
      financial_year VARCHAR(9) NOT NULL,

      invoice_date DATE NOT NULL,
      due_date DATE,

      place_of_supply VARCHAR(2) NOT NULL,
      is_igst BOOLEAN NOT NULL,

      subtotal NUMERIC(15,2) NOT NULL CHECK (subtotal >= 0),
      total_discount NUMERIC(15,2) DEFAULT 0 CHECK (total_discount >= 0),
      taxable_amount NUMERIC(15,2) NOT NULL CHECK (taxable_amount >= 0),

      cgst_amount NUMERIC(15,2) DEFAULT 0 CHECK (cgst_amount >= 0),
      sgst_amount NUMERIC(15,2) DEFAULT 0 CHECK (sgst_amount >= 0),
      igst_amount NUMERIC(15,2) DEFAULT 0 CHECK (igst_amount >= 0),

      total_tax NUMERIC(15,2) NOT NULL CHECK (total_tax >= 0),
      round_off NUMERIC(5,2) DEFAULT 0,

      grand_total NUMERIC(15,2) NOT NULL CHECK (grand_total >= 0),

      amount_paid NUMERIC(15,2) DEFAULT 0 CHECK (amount_paid >= 0),
      balance_due NUMERIC(15,2) NOT NULL CHECK (balance_due >= 0),

      payment_status payment_status NOT NULL,

      notes TEXT,
      template_id VARCHAR(50) DEFAULT 'default',
      pdf_url TEXT,

      created_by UUID REFERENCES users(id),

      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),

      UNIQUE (business_id, invoice_number)
    );
  `);

  console.log("Invoices table created successfully");
  process.exit();
}

run();