import pool from "../config/db";

async function run() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS analytics_rollups (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            event_date DATE NOT NULL,
            event_type VARCHAR(64) NOT NULL,
            event_count INTEGER NOT NULL DEFAULT 0,
            invoice_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
            payment_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (business_id, event_date, event_type)
        );

        CREATE INDEX IF NOT EXISTS idx_analytics_rollups_business_date ON analytics_rollups (business_id, event_date DESC);
    `);

    console.log("Analytics rollups table created");
    process.exit();
}

run();
