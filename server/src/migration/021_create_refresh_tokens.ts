import type { Pool, PoolClient } from "pg";
import pool from "../config/db";

type MigrationDb = Pick<PoolClient | Pool, "query">;

export async function up(db: MigrationDb = pool) {
    await db.query(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            token_id VARCHAR(128) NOT NULL UNIQUE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            revoked_at TIMESTAMPTZ,
            replaced_by_token_id VARCHAR(128),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
    `);

    console.log("Refresh tokens table created successfully");
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
