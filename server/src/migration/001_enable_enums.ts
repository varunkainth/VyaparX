import type { Pool, PoolClient } from "pg";
import pool from "../config/db";

type MigrationDb = Pick<PoolClient | Pool, "query">;

export async function up(db: MigrationDb = pool) {
    await db.query(`
        DO $$ BEGIN
        CREATE TYPE party_type AS ENUM ('customer','supplier','both');
        EXCEPTION
        WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
        CREATE TYPE payment_mode AS ENUM ('cash','bank_transfer','upi','card','cheque','other');
        EXCEPTION
        WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
        CREATE TYPE payment_type AS ENUM ('received','made');
        EXCEPTION
        WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
        CREATE TYPE movement_type AS ENUM ('purchase', 'sale', 'adjustment', 'return_in', 'return_out');
        EXCEPTION
        WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
        CREATE TYPE direction AS ENUM ('in', 'out');
        EXCEPTION
        WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
        CREATE TYPE invoice_type AS ENUM ('sales', 'purchase', 'credit_note', 'debit_note');
        EXCEPTION
        WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
        CREATE TYPE payment_status AS ENUM ('unpaid', 'partial', 'paid', 'overdue');
        EXCEPTION
        WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
        CREATE TYPE entry_type AS ENUM ('invoice', 'payment', 'adjustment', 'opening_balance');
        EXCEPTION
        WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
        CREATE TYPE account_type AS ENUM ('current', 'savings', 'cash', 'upi_wallet');
        EXCEPTION
        WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
        CREATE TYPE ob_type AS ENUM ('receivable', 'payable', 'none');
        EXCEPTION
        WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
        CREATE TYPE reference_type AS ENUM ('invoice', 'payment', 'purchase_order', 'manual');
        EXCEPTION
        WHEN duplicate_object THEN null;
        END $$;
    `);
}

if (import.meta.main) {
    up()
        .then(() => {
            console.log("All ENUM types created successfully");
        })
        .catch((error) => {
            console.error("Migration failed:", error);
            process.exitCode = 1;
        })
        .finally(async () => {
            await pool.end();
        });
}
