import pool from "../config/db";

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

      account_name VARCHAR(100) NOT NULL,
      bank_name VARCHAR(100) NOT NULL,
      account_no VARCHAR(20) NOT NULL,
      ifsc VARCHAR(11),

      account_type account_type NOT NULL,

      opening_balance NUMERIC(15,2) DEFAULT 0 CHECK (opening_balance >= 0),
      current_balance NUMERIC(15,2) DEFAULT 0 CHECK (current_balance >= 0),

      is_default BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,

      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  console.log("Bank accounts table created successfully");
  process.exit();
}

run();