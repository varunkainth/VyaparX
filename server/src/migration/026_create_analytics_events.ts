import type { Pool, PoolClient } from "pg";
import pool from "../config/db";

type MigrationDb = Pick<PoolClient | Pool, "query">;

export async function up(db: MigrationDb = pool) {
    await db.query(`
        CREATE TABLE IF NOT EXISTS analytics_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            event_type VARCHAR(64) NOT NULL,
            entity_type VARCHAR(64),
            entity_id VARCHAR(128),
            actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            event_data JSONB
        );

        CREATE INDEX IF NOT EXISTS idx_analytics_events_business_time
            ON analytics_events (business_id, occurred_at DESC);
        CREATE INDEX IF NOT EXISTS idx_analytics_events_type_time
            ON analytics_events (event_type, occurred_at DESC);
    `);

    console.log("Analytics events table created successfully");
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
