import type { Pool, PoolClient } from "pg";
import pool from "../config/db";

type MigrationDb = Pick<PoolClient | Pool, "query">;

export async function up(db: MigrationDb = pool) {
    await db.query(`
        DO $$ BEGIN
            CREATE TYPE user_role AS ENUM ('owner', 'admin', 'accountant', 'staff');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    `);
    console.log("User Role Enum Type Created Successfully");

    await db.query(`
        ALTER TABLE users
            ADD COLUMN IF NOT EXISTS role          user_role NOT NULL DEFAULT 'owner',
            ADD COLUMN IF NOT EXISTS token_version INTEGER   NOT NULL DEFAULT 1;
    `);
    console.log("Users Table Altered Successfully");
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
