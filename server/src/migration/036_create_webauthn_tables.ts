import type { Pool, PoolClient } from "pg";
import pool from "../config/db";

type MigrationDb = Pick<PoolClient | Pool, "query">;

export async function up(db: MigrationDb = pool) {
    await db.query(`
        CREATE TABLE IF NOT EXISTS webauthn_credentials (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            credential_id VARCHAR(512) NOT NULL UNIQUE,
            public_key TEXT NOT NULL,
            counter BIGINT NOT NULL DEFAULT 0,
            transports TEXT[] NOT NULL DEFAULT '{}'::text[],
            credential_device_type VARCHAR(32) NOT NULL DEFAULT 'singleDevice',
            credential_backed_up BOOLEAN NOT NULL DEFAULT false,
            label VARCHAR(255) NOT NULL DEFAULT 'Passkey',
            last_used_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user_id
            ON webauthn_credentials (user_id, created_at DESC);

        CREATE TABLE IF NOT EXISTS webauthn_challenges (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            challenge TEXT NOT NULL,
            challenge_type VARCHAR(32) NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_user_type
            ON webauthn_challenges (user_id, challenge_type, created_at DESC);
    `);
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
