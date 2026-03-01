import pool from "../config/db";

async function run() {
    await pool.query(`
        ALTER TABLE sync_mutations
            ADD COLUMN IF NOT EXISTS request_hash VARCHAR(128),
            ADD COLUMN IF NOT EXISTS response_json JSONB;

        CREATE INDEX IF NOT EXISTS idx_sync_mutations_dedupe
            ON sync_mutations (business_id, device_id, client_mutation_id);
    `);

    console.log("Sync idempotency hardening applied");
    process.exit();
}

run();

