import type { Pool, PoolClient } from "pg";
import pool from "../config/db";

type MigrationDb = Pick<PoolClient | Pool, "query">;

export async function up(db: MigrationDb = pool) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS payment_allocations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
      invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

      allocated_amount NUMERIC(15,2) NOT NULL CHECK (allocated_amount > 0),

      created_at TIMESTAMPTZ DEFAULT now(),

      UNIQUE (payment_id, invoice_id)
    );
  `);

  console.log("Payment allocations table created successfully");}


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
