import pool from "../config/db";

async function run() {
    // One-time fix for existing unreconciled cash payments
    // This migration fixes a bug where cash payments weren't being auto-reconciled
    // Going forward, cash payments will require manual verification for better control
    
    const result = await pool.query(`
        UPDATE payments
        SET 
            is_reconciled = true,
            reconciled_at = COALESCE(reconciled_at, created_at),
            reconciled_by = COALESCE(reconciled_by, created_by),
            bank_statement_date = COALESCE(bank_statement_date, payment_date),
            bank_ref_no = COALESCE(bank_ref_no, 'CASH'),
            notes = CASE 
                WHEN notes IS NULL OR notes = '' THEN 'Auto-verified (Migration fix for old cash payments)'
                ELSE notes || ' | Auto-verified (Migration fix)'
            END,
            updated_at = now()
        WHERE payment_mode = 'cash'
          AND is_reconciled = false
          AND created_at < '2026-03-02'::date;  -- Only fix old payments before this date
    `);

    console.log(`✓ Fixed ${result.rowCount} old unreconciled cash payment(s)`);
    console.log(`ℹ️  Future cash payments will require manual verification for better cash flow control`);
    process.exit();
}

run();
