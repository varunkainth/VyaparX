import pool from "../config/db";

async function run() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS idempotency_keys (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            action          VARCHAR(64) NOT NULL,
            idempotency_key VARCHAR(128) NOT NULL,
            status          VARCHAR(20) NOT NULL DEFAULT 'in_progress',
            response_json   JSONB,
            created_by      UUID REFERENCES users(id),
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (business_id, action, idempotency_key)
        );

        CREATE INDEX IF NOT EXISTS idx_idempotency_lookup
            ON idempotency_keys (business_id, action, idempotency_key);
    `);

    console.log("idempotency_keys table created");
    process.exit();
}

run();
