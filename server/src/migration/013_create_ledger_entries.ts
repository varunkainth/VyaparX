import type { Pool, PoolClient } from "pg";
import pool from "../config/db";

type MigrationDb = Pick<PoolClient | Pool, "query">;

export async function up(db: MigrationDb = pool) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS ledger_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      party_id UUID NOT NULL REFERENCES parties(id),

      entry_type entry_type NOT NULL,

      debit NUMERIC(15,2) DEFAULT 0 CHECK (debit >= 0),
      credit NUMERIC(15,2) DEFAULT 0 CHECK (credit >= 0),

      balance_after NUMERIC(15,2) NOT NULL,

      reference_type reference_type,
      reference_id UUID,

      description TEXT NOT NULL,

      entry_date DATE NOT NULL,

      created_by UUID REFERENCES users(id),

      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  console.log("Ledger entries table created successfully");}


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
