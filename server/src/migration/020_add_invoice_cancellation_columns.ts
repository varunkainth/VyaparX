import type { Pool, PoolClient } from "pg";
import pool from "../config/db";

type MigrationDb = Pick<PoolClient | Pool, "query">;

export async function up(db: MigrationDb = pool) {
    await db.query(`
        ALTER TABLE invoices
            ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN NOT NULL DEFAULT false,
            ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(id),
            ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

        CREATE INDEX IF NOT EXISTS idx_invoices_business_cancelled_date
            ON invoices (business_id, is_cancelled, invoice_date DESC);
    `);

    console.log("Invoice cancellation columns added");
}


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
