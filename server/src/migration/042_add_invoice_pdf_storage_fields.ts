import type { Pool, PoolClient } from "pg";
import pool from "../config/db";

type MigrationDb = Pick<PoolClient | Pool, "query">;

export async function up(db: MigrationDb = pool) {
    await db.query(`
        ALTER TABLE invoices
        ADD COLUMN IF NOT EXISTS pdf_object_key TEXT,
        ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS pdf_status VARCHAR(20),
        ADD COLUMN IF NOT EXISTS pdf_error TEXT,
        ADD COLUMN IF NOT EXISTS pdf_template_id VARCHAR(50);

        ALTER TABLE invoices
        DROP CONSTRAINT IF EXISTS invoices_pdf_status_check;

        ALTER TABLE invoices
        ADD CONSTRAINT invoices_pdf_status_check
        CHECK (pdf_status IS NULL OR pdf_status IN ('pending', 'processing', 'ready', 'failed'));
    `);

    console.log("Added invoice PDF storage fields");
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
