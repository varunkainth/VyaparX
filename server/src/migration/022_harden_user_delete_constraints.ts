import type { Pool, PoolClient } from "pg";
import pool from "../config/db";

type MigrationDb = Pick<PoolClient | Pool, "query">;

export async function up(db: MigrationDb = pool) {
    await db.query(`
        ALTER TABLE users
            ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

        DO $$
        DECLARE
            rec RECORD;
        BEGIN
            -- businesses.owner_id must NOT cascade-delete business data.
            FOR rec IN
                SELECT c.conname
                FROM pg_constraint c
                JOIN pg_class t ON t.oid = c.conrelid
                JOIN pg_namespace n ON n.oid = t.relnamespace
                JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
                WHERE c.contype = 'f'
                  AND n.nspname = 'public'
                  AND t.relname = 'businesses'
                  AND a.attname = 'owner_id'
            LOOP
                EXECUTE format('ALTER TABLE public.businesses DROP CONSTRAINT %I', rec.conname);
            END LOOP;

            ALTER TABLE public.businesses
                ADD CONSTRAINT businesses_owner_id_fkey
                FOREIGN KEY (owner_id)
                REFERENCES public.users(id)
                ON DELETE RESTRICT;
        END $$;

        DO $$
        DECLARE
            rec RECORD;
        BEGIN
            -- created_by / cancelled_by / reconciled_by / invited_by should preserve records if user is deleted.
            FOR rec IN
                SELECT c.conname, t.relname AS table_name, a.attname AS column_name
                FROM pg_constraint c
                JOIN pg_class t ON t.oid = c.conrelid
                JOIN pg_namespace n ON n.oid = t.relnamespace
                JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
                WHERE c.contype = 'f'
                  AND n.nspname = 'public'
                  AND (
                    (t.relname = 'invoices' AND a.attname IN ('created_by', 'cancelled_by')) OR
                    (t.relname = 'payments' AND a.attname IN ('created_by', 'reconciled_by')) OR
                    (t.relname = 'ledger_entries' AND a.attname = 'created_by') OR
                    (t.relname = 'stock_movements' AND a.attname = 'created_by') OR
                    (t.relname = 'idempotency_keys' AND a.attname = 'created_by') OR
                    (t.relname = 'business_members' AND a.attname = 'invited_by')
                  )
            LOOP
                EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', rec.table_name, rec.conname);

                EXECUTE format(
                    'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.users(id) ON DELETE SET NULL',
                    rec.table_name,
                    rec.table_name || '_' || rec.column_name || '_fkey',
                    rec.column_name
                );
            END LOOP;
        END $$;

        CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users (deleted_at);
    `);

    console.log("User delete constraints hardened successfully");
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
