import type { Pool, PoolClient } from "pg";
import pool from "../config/db";

type MigrationDb = Pick<PoolClient | Pool, "query">;

export async function up(db: MigrationDb = pool) {
    const result = await db.query(`
        UPDATE payments
        SET
            is_reconciled = true,
            reconciled_at = COALESCE(reconciled_at, created_at, now()),
            reconciled_by = COALESCE(reconciled_by, created_by),
            bank_statement_date = COALESCE(bank_statement_date, payment_date),
            bank_ref_no = COALESCE(
                NULLIF(bank_ref_no, ''),
                NULLIF(upi_ref, ''),
                NULLIF(cheque_no, ''),
                CASE
                    WHEN payment_mode = 'card' THEN 'CARD'
                    WHEN payment_mode = 'other' THEN 'OTHER'
                    ELSE NULL
                END
            ),
            notes = CASE
                WHEN notes IS NULL OR notes = '' THEN 'Auto-reconciled by migration for legacy non-cash payments'
                ELSE notes || ' | Auto-reconciled by migration for legacy non-cash payments'
            END,
            updated_at = now()
        WHERE payment_mode <> 'cash'
          AND is_reconciled = false;
    `);

    console.log(`Auto-reconciled ${result.rowCount} legacy non-cash payment(s)`);
    console.log("Cash payments were left untouched");
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
