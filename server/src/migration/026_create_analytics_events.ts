import pool from "../config/db";

async function run() {
    await pool.query(`
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
    process.exit();
}

run();

