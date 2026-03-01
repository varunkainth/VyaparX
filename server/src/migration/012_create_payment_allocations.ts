import pool from "../config/db";

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_allocations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
      invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

      allocated_amount NUMERIC(15,2) NOT NULL CHECK (allocated_amount > 0),

      created_at TIMESTAMPTZ DEFAULT now(),

      UNIQUE (payment_id, invoice_id)
    );
  `);

  console.log("Payment allocations table created successfully");
  process.exit();
}

run();