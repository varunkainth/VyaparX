import type { Pool, PoolClient } from "pg";
import pool from "../config/db";

type MigrationDb = Pick<PoolClient | Pool, "query">;

export async function up(db: MigrationDb = pool) {
    await db.query(`
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            phone VARCHAR(20) UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name VARCHAR(255) NOT NULL,
            isVerified BOOLEAN DEFAULT false,
            updated_at TIMESTAMP DEFAULT now(),
            created_at TIMESTAMP DEFAULT now()
        );
    `);
}

if (import.meta.main) {
    up()
        .then(() => {
            console.log("Users table created successfully");
        })
        .catch((error) => {
            console.error("Migration failed:", error);
            process.exitCode = 1;
        })
        .finally(async () => {
            await pool.end();
        });
}
