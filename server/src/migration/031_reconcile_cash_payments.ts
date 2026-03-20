import type { Pool, PoolClient } from "pg";
import pool from "../config/db";

type MigrationDb = Pick<PoolClient | Pool, "query">;

export async function up(db: MigrationDb = pool) {
    // Auto-reconcile all existing cash payments
    const result = await db.query(`
        UPDATE payments
        SET 
            is_reconciled = true,
            reconciled_at = created_at,
            reconciled_by = created_by,
            bank_statement_date = payment_date,
            bank_ref_no = 'CASH',
            notes = COALESCE(notes || ' | ', '') || 'Auto-reconciled (Cash payment)'
        WHERE payment_mode = 'cash'
          AND is_reconciled = false;
    `);

    console.log(`✓ Auto-reconciled ${result.rowCount} existing cash payment(s)`);}


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
