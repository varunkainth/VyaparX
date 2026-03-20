import type { Pool, PoolClient } from "pg";
import pool from "../config/db";

type MigrationDb = Pick<PoolClient | Pool, "query">;

export async function up(db: MigrationDb = pool) {
    await db.query(`
        CREATE TABLE IF NOT EXISTS sync_mutations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            device_id VARCHAR(128) NOT NULL,
            client_mutation_id VARCHAR(128) NOT NULL,
            entity_type VARCHAR(64) NOT NULL,
            operation VARCHAR(32) NOT NULL,
            entity_id VARCHAR(128),
            request_json JSONB,
            status VARCHAR(20) NOT NULL,
            error_code VARCHAR(64),
            error_message TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            applied_at TIMESTAMPTZ,
            UNIQUE (business_id, device_id, client_mutation_id)
        );

        CREATE INDEX IF NOT EXISTS idx_sync_mutations_business_created_at
            ON sync_mutations (business_id, created_at DESC);

        CREATE TABLE IF NOT EXISTS sync_changes (
            id BIGSERIAL PRIMARY KEY,
            business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            entity_type VARCHAR(64) NOT NULL,
            entity_id VARCHAR(128) NOT NULL,
            operation VARCHAR(32) NOT NULL,
            payload JSONB,
            changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_sync_changes_business_id
            ON sync_changes (business_id, id);
    `);

    console.log("Sync tables created successfully");
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
