import pool from "../config/db";

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS invoice_sequences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

      financial_year VARCHAR(9) NOT NULL,
      invoice_type invoice_type NOT NULL,

      last_sequence_no INTEGER NOT NULL DEFAULT 0 CHECK (last_sequence_no >= 0),

      UNIQUE (business_id, financial_year, invoice_type)
    );
  `);

  console.log("Invoice sequences table created successfully");
  process.exit();
}

run();