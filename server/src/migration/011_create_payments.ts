import type { Pool, PoolClient } from "pg";
import pool from "../config/db";

type MigrationDb = Pick<PoolClient | Pool, "query">;

export async function up(db: MigrationDb = pool) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      party_id UUID NOT NULL REFERENCES parties(id),

      payment_type payment_type NOT NULL,
      amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),

      payment_date DATE NOT NULL,
      payment_mode payment_mode NOT NULL,

      upi_ref VARCHAR(100),
      cheque_no VARCHAR(50),
      cheque_date DATE,

      bank_account_id UUID REFERENCES bank_accounts(id),

      bank_ref_no VARCHAR(100),
      bank_statement_date DATE,

      is_reconciled BOOLEAN DEFAULT false,
      reconciled_at TIMESTAMPTZ,
      reconciled_by UUID REFERENCES users(id),

      notes TEXT,

      created_by UUID REFERENCES users(id),

      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  console.log("Payments table created successfully");}


if (import.meta.main) {
    up()
        .then(() => {
            console.log("Migration applied successfully");
        })
        .catch((error) => {
            console.error("Migration failed:", error);
            process.exitCode = 1;
        })
        .finally(async () => {
            await pool.end();
        });
}
