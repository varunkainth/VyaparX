import type { Pool, PoolClient } from "pg";
import pool from "../config/db";

type MigrationDb = Pick<PoolClient | Pool, "query">;

export async function up(db: MigrationDb = pool) {
    console.log("Backfilling invoice sequences from existing invoices...");

    const result = await db.query(`
        WITH invoice_scope_max AS (
            SELECT
                business_id,
                financial_year,
                sequence_type,
                COALESCE(MAX((substring(invoice_number FROM '([0-9]+)$'))::int), 0) AS max_sequence_no
            FROM (
                SELECT
                    business_id,
                    financial_year,
                    CASE
                        WHEN invoice_type IN ('sales', 'credit_note') THEN 'sales'::invoice_type
                        ELSE 'purchase'::invoice_type
                    END AS sequence_type,
                    invoice_number
                FROM invoices
                WHERE invoice_type IN ('sales', 'purchase', 'credit_note', 'debit_note')
            ) invoice_scope
            GROUP BY business_id, financial_year, sequence_type
        )
        INSERT INTO invoice_sequences (
            business_id,
            financial_year,
            invoice_type,
            last_sequence_no
        )
        SELECT
            business_id,
            financial_year,
            sequence_type,
            max_sequence_no
        FROM invoice_scope_max
        ON CONFLICT (business_id, financial_year, invoice_type)
        DO UPDATE SET
            last_sequence_no = GREATEST(invoice_sequences.last_sequence_no, EXCLUDED.last_sequence_no)
    `);

    console.log(`Backfilled ${result.rowCount} invoice sequence row(s)`);
    console.log("Invoice sequences backfill completed successfully");
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