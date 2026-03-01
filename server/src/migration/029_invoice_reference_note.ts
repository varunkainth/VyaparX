import pool from "../config/db";

async function run() {
    await pool.query(`
        ALTER TABLE invoices
        ADD COLUMN IF NOT EXISTS reference_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

        ALTER TABLE invoices
        ADD COLUMN IF NOT EXISTS note_reason TEXT;
    `);

    console.log("Invoice reference columns added");
    process.exit();
}

run();
