import type { Pool, PoolClient } from "pg";
import pool from "../config/db";

type MigrationDb = Pick<PoolClient | Pool, "query">;

export async function up(db: MigrationDb = pool) {
    await db.query(`
        ALTER TABLE sync_mutations
            ADD COLUMN IF NOT EXISTS request_hash VARCHAR(128),
            ADD COLUMN IF NOT EXISTS response_json JSONB;

        CREATE INDEX IF NOT EXISTS idx_sync_mutations_dedupe
            ON sync_mutations (business_id, device_id, client_mutation_id);
    `);

    console.log("Sync idempotency hardening applied");
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
