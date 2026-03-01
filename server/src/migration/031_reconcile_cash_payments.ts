import pool from "../config/db";

async function run() {
    // Auto-reconcile all existing cash payments
    const result = await pool.query(`
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

    console.log(`✓ Auto-reconciled ${result.rowCount} existing cash payment(s)`);
    process.exit();
}

run();
