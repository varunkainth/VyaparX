import type { Pool, PoolClient } from "pg";
import pool from "../config/db";

type MigrationDb = Pick<PoolClient | Pool, "query">;

export async function up(db: MigrationDb = pool) {
        console.log("Backfilling invoice-level tax amounts from invoice items...");

        // Update invoices with aggregated tax amounts from their items
        const result = await db.query(`
            UPDATE invoices i
            SET 
                cgst_amount = COALESCE(item_totals.total_cgst, 0),
                sgst_amount = COALESCE(item_totals.total_sgst, 0),
                igst_amount = COALESCE(item_totals.total_igst, 0)
            FROM (
                SELECT 
                    invoice_id,
                    SUM(cgst_amount) as total_cgst,
                    SUM(sgst_amount) as total_sgst,
                    SUM(igst_amount) as total_igst
                FROM invoice_items
                GROUP BY invoice_id
            ) item_totals
            WHERE i.id = item_totals.invoice_id
            AND (
                i.cgst_amount IS NULL OR i.cgst_amount = 0 OR
                i.sgst_amount IS NULL OR i.sgst_amount = 0 OR
                i.igst_amount IS NULL OR i.igst_amount = 0
            )
        `);

        console.log(`Updated ${result.rowCount} invoices with tax amounts from items`);
        console.log("Invoice tax amounts backfilled successfully");
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
