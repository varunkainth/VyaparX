import type { Pool, PoolClient } from "pg";
import pool from "../config/db";

type MigrationDb = Pick<PoolClient | Pool, "query">;

export async function up(db: MigrationDb = pool) {
    // One-time fix for existing unreconciled cash payments
    // This migration fixes a bug where cash payments weren't being auto-reconciled.
    const result = await db.query(`
        UPDATE payments
        SET
            is_reconciled = true,
            reconciled_at = COALESCE(reconciled_at, created_at),
            reconciled_by = COALESCE(reconciled_by, created_by),
            bank_statement_date = COALESCE(bank_statement_date, payment_date),
            bank_ref_no = COALESCE(bank_ref_no, 'CASH'),
            notes = CASE
                WHEN notes IS NULL OR notes = '' THEN 'Auto-verified (migration fix for old cash payments)'
                ELSE notes || ' | Auto-verified (migration fix)'
            END,
            updated_at = now()
        WHERE payment_mode = 'cash'
          AND is_reconciled = false
          AND created_at < '2026-03-02'::date;
    `);

    console.log(`Fixed ${result.rowCount} old unreconciled cash payment(s)`);
    console.log("Future cash payments will require manual verification for better cash flow control");
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
