// 016_add_is_active_to_users.ts
import pool from "../config/db";

async function run() {
    await pool.query(`
        ALTER TABLE users
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

        CREATE INDEX IF NOT EXISTS idx_users_is_active 
            ON users (is_active) 
            WHERE is_active = true;
    `);
    console.log("Added is_active to users table");
    process.exit();
}

run();
