import type { Pool, PoolClient } from "pg";
import pool from "../config/db";

type MigrationDb = Pick<PoolClient | Pool, "query">;

export async function up(db: MigrationDb = pool) {
    await db.query(`
        CREATE TABLE IF NOT EXISTS invoice_settings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            business_id UUID NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
            
            -- Invoice Numbering
            invoice_prefix VARCHAR(10) DEFAULT 'INV',
            invoice_number_format VARCHAR(50) DEFAULT 'INV-{YYYY}-{####}',
            next_invoice_number INTEGER DEFAULT 1,
            reset_numbering VARCHAR(20) DEFAULT 'never' CHECK (reset_numbering IN ('never', 'yearly', 'monthly')),
            
            -- Purchase Invoice Numbering
            purchase_prefix VARCHAR(10) DEFAULT 'PUR',
            purchase_number_format VARCHAR(50) DEFAULT 'PUR-{YYYY}-{####}',
            next_purchase_number INTEGER DEFAULT 1,
            
            -- Default Settings
            default_due_days INTEGER DEFAULT 30,
            default_template VARCHAR(50) DEFAULT 'default',
            default_currency VARCHAR(3) DEFAULT 'INR',
            
            -- Tax Settings
            enable_tax BOOLEAN DEFAULT true,
            tax_label VARCHAR(20) DEFAULT 'GST',
            show_tax_number BOOLEAN DEFAULT true,
            
            -- Display Settings
            show_logo BOOLEAN DEFAULT true,
            show_signature BOOLEAN DEFAULT false,
            show_terms BOOLEAN DEFAULT false,
            default_terms TEXT,
            show_notes BOOLEAN DEFAULT false,
            default_notes TEXT,
            
            -- Email Settings
            email_subject_template VARCHAR(255) DEFAULT 'Invoice {invoice_number} from {business_name}',
            email_body_template TEXT DEFAULT 'Dear Customer,\n\nPlease find attached invoice {invoice_number} for {amount}.\n\nThank you for your business!',
            auto_send_email BOOLEAN DEFAULT false,
            
            -- Payment Settings
            enable_online_payment BOOLEAN DEFAULT false,
            payment_instructions TEXT,
            
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_invoice_settings_business_id ON invoice_settings(business_id);
    `);

    console.log("Invoice settings table created successfully");}


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
