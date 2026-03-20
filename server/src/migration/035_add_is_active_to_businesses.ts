import type { Pool, PoolClient } from "pg";
import pool from "../config/db";

type MigrationDb = Pick<PoolClient | Pool, "query">;

export async function up(db: MigrationDb = pool) {
    // Add is_active column to businesses table
    await db.query(`
        DO $$ 
        BEGIN
            -- Check if column doesn't exist before adding
            IF NOT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                  AND table_name = 'businesses' 
                  AND column_name = 'is_active'
            ) THEN
                ALTER TABLE businesses 
                ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL;
                
                RAISE NOTICE 'Added is_active column to businesses table';
            ELSE
                RAISE NOTICE 'is_active column already exists in businesses table';
            END IF;
        END $$;
    `);

    // Ensure all existing businesses are set to active (in case default didn't apply)
    const result = await db.query(`
        UPDATE businesses 
        SET is_active = COALESCE(is_active, true);
    `);

    // Get count of businesses
    const countResult = await db.query(`
        SELECT COUNT(*) as total, 
               COUNT(*) FILTER (WHERE is_active = true) as active,
               COUNT(*) FILTER (WHERE is_active = false) as inactive
        FROM businesses;
    `);

    const stats = countResult.rows[0];

    console.log(`✓ Added is_active column to businesses table`);
    console.log(`✓ Total businesses: ${stats.total}`);
    console.log(`✓ Active businesses: ${stats.active}`);
    console.log(`✓ Inactive businesses: ${stats.inactive}`);}


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
