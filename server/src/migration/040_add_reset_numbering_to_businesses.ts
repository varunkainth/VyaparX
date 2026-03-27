import type { Pool, PoolClient } from "pg";
import pool from "../config/db";

type MigrationDb = Pick<PoolClient | Pool, "query">;

export async function up(db: MigrationDb = pool) {
    await db.query(`
        ALTER TABLE businesses
        ADD COLUMN IF NOT EXISTS reset_numbering VARCHAR(20) DEFAULT 'never'
        CHECK (reset_numbering IN ('never', 'yearly', 'monthly'));

        UPDATE businesses AS b
        SET reset_numbering = COALESCE(s.reset_numbering, 'never')
        FROM invoice_settings AS s
        WHERE s.business_id = b.id
          AND (b.reset_numbering IS NULL OR b.reset_numbering = 'never');

        UPDATE businesses
        SET reset_numbering = 'never'
        WHERE reset_numbering IS NULL;

        ALTER TABLE businesses
        ALTER COLUMN reset_numbering SET DEFAULT 'never';
    `);

    console.log("Added reset_numbering to businesses");
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
