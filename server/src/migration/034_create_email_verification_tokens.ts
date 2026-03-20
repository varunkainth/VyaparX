import type { Pool, PoolClient } from "pg";
import pool from "../config/db";

type MigrationDb = Pick<PoolClient | Pool, "query">;

export async function up(db: MigrationDb = pool) {
    await db.query(`
        CREATE TABLE IF NOT EXISTS email_verification_tokens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token TEXT NOT NULL UNIQUE,
            expires_at TIMESTAMPTZ NOT NULL,
            verified_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);
        CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires_at ON email_verification_tokens(expires_at);
    `);

    console.log("Email verification tokens table created successfully");}


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
