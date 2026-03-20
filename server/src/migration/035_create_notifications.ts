import type { Pool, PoolClient } from "pg";
import pool from "../config/db";

type MigrationDb = Pick<PoolClient | Pool, "query">;

export async function up(db: MigrationDb = pool) {
    await db.query(`
        CREATE TABLE IF NOT EXISTS notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type VARCHAR(50) NOT NULL,
            priority VARCHAR(20) NOT NULL DEFAULT 'medium',
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            link TEXT,
            metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
            read BOOLEAN NOT NULL DEFAULT false,
            dedupe_key VARCHAR(255),
            is_resolved BOOLEAN NOT NULL DEFAULT false,
            resolved_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_notifications_user_business_created
            ON notifications (user_id, business_id, created_at DESC);

        CREATE INDEX IF NOT EXISTS idx_notifications_business_resolved
            ON notifications (business_id, is_resolved, created_at DESC);

        CREATE INDEX IF NOT EXISTS idx_notifications_dedupe_key
            ON notifications (business_id, dedupe_key)
            WHERE dedupe_key IS NOT NULL;
    `);

    console.log("Notifications table created");
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
