// 016_add_is_active_to_users.ts
import type { Pool, PoolClient } from "pg";
import pool from "../config/db";

type MigrationDb = Pick<PoolClient | Pool, "query">;

export async function up(db: MigrationDb = pool) {
    await db.query(`
        ALTER TABLE users
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

        CREATE INDEX IF NOT EXISTS idx_users_is_active 
            ON users (is_active) 
            WHERE is_active = true;
    `);
    console.log("Added is_active to users table");}


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
