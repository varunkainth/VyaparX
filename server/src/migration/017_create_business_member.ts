// 017_create_business_members.ts
import pool from "../config/db";

async function run() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS business_members (
            id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

            business_id UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,

            role        user_role   NOT NULL DEFAULT 'staff',

            invited_by  UUID        REFERENCES users(id),
            joined_at   TIMESTAMPTZ DEFAULT now(),
            is_active   BOOLEAN     NOT NULL DEFAULT true,

            UNIQUE (business_id, user_id)  -- one role per user per business
        );

        CREATE INDEX IF NOT EXISTS idx_business_members_business_id 
            ON business_members (business_id, is_active);
        
        CREATE INDEX IF NOT EXISTS idx_business_members_user_id 
            ON business_members (user_id, is_active);
    `);
    console.log("business_members table created");
    process.exit();
}

run();
