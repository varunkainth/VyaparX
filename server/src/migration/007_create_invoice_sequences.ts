import type { Pool, PoolClient } from "pg";
import pool from "../config/db";

type MigrationDb = Pick<PoolClient | Pool, "query">;

export async function up(db: MigrationDb = pool) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS invoice_sequences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

      financial_year VARCHAR(9) NOT NULL,
      invoice_type invoice_type NOT NULL,

      last_sequence_no INTEGER NOT NULL DEFAULT 0 CHECK (last_sequence_no >= 0),

      UNIQUE (business_id, financial_year, invoice_type)
    );
  `);

  console.log("Invoice sequences table created successfully");}


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
