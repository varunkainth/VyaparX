import pool from "../config/db";

async function run() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
            actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            action VARCHAR(64) NOT NULL,
            entity_type VARCHAR(64) NOT NULL,
            entity_id VARCHAR(128),
            metadata JSONB,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_audit_logs_business_created_at
            ON audit_logs (business_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_action
            ON audit_logs (action, created_at DESC);
    `);

    console.log("Audit logs table created successfully");
    process.exit();
}

run();

