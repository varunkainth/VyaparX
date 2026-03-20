import type { Pool, PoolClient } from "pg";
import pool from "../config/db";

type MigrationDb = Pick<PoolClient | Pool, "query">;

export async function up(db: MigrationDb = pool) {
    await db.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_item_price_mode') THEN
                CREATE TYPE invoice_item_price_mode AS ENUM ('exclusive', 'inclusive');
            END IF;
        END
        $$;

        ALTER TABLE invoice_items
        ADD COLUMN IF NOT EXISTS price_mode invoice_item_price_mode NOT NULL DEFAULT 'exclusive';
    `);

    console.log("Invoice item price_mode column added");
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
