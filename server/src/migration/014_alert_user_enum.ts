import pool from "../config/db";

async function run() {
    await pool.query(`
        DO $$ BEGIN
            CREATE TYPE user_role AS ENUM ('owner', 'admin', 'accountant', 'staff');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    `);
    console.log("User Role Enum Type Created Successfully");

    await pool.query(`
        ALTER TABLE users
            ADD COLUMN IF NOT EXISTS role          user_role NOT NULL DEFAULT 'owner',
            ADD COLUMN IF NOT EXISTS token_version INTEGER   NOT NULL DEFAULT 1;
    `);
    console.log("Users Table Altered Successfully");

    process.exit();
}

run();
