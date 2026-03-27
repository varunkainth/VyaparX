import type { Pool, PoolClient } from "pg";
import pool from "../config/db";

type MigrationDb = Pick<PoolClient | Pool, "query">;

export async function up(db: MigrationDb = pool) {
    await db.query(`
        ALTER TABLE businesses
        ADD COLUMN IF NOT EXISTS purchase_prefix VARCHAR(10) DEFAULT 'PUR';

        UPDATE businesses AS b
        SET purchase_prefix = COALESCE(s.purchase_prefix, 'PUR')
        FROM invoice_settings AS s
        WHERE s.business_id = b.id
          AND (b.purchase_prefix IS NULL OR b.purchase_prefix = 'PUR');

        UPDATE businesses
        SET purchase_prefix = 'PUR'
        WHERE purchase_prefix IS NULL;

        ALTER TABLE businesses
        ALTER COLUMN purchase_prefix SET DEFAULT 'PUR';
    `);

    console.log("Added purchase_prefix to businesses");
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
