import pool from "../config/db";

async function run() {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        await client.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'users'
                      AND column_name = 'isverified'
                )
                AND NOT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'users'
                      AND column_name = 'is_verified'
                ) THEN
                    ALTER TABLE users RENAME COLUMN isverified TO is_verified;
                END IF;
            END $$;
        `);

        await client.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'users'
                      AND column_name = 'password'
                )
                AND NOT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'users'
                      AND column_name = 'password_hash'
                ) THEN
                    ALTER TABLE users RENAME COLUMN password TO password_hash;
                END IF;
            END $$;
        `);

        await client.query(`
            DO $$ BEGIN
                ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'viewer';
            EXCEPTION
                WHEN undefined_object THEN NULL;
            END $$;
        `);

        await client.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'users'
                      AND column_name = 'role'
                ) THEN
                    ALTER TABLE users
                        ALTER COLUMN role SET DEFAULT 'staff';
                END IF;
            END $$;
        `);

        await client.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'parties'
                      AND column_name = 'phone'
                ) THEN
                    ALTER TABLE parties
                        ALTER COLUMN phone TYPE VARCHAR(15);
                END IF;
            END $$;
        `);

        await client.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'businesses'
                      AND column_name = 'bank_ifsc_code'
                )
                AND NOT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'businesses'
                      AND column_name = 'bank_ifsc'
                ) THEN
                    ALTER TABLE businesses RENAME COLUMN bank_ifsc_code TO bank_ifsc;
                END IF;
            END $$;
        `);

        await client.query("COMMIT");
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Schema patch failed:", err);
        throw err;
    } finally {
        client.release();
    }

    const indexes = [
        `CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);`,
        `CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone);`,
        `CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON businesses (owner_id);`,
        `CREATE INDEX IF NOT EXISTS idx_businesses_gstin ON businesses (gstin);`,
        `CREATE INDEX IF NOT EXISTS idx_parties_business_id_is_active ON parties (business_id, is_active);`,
        `CREATE INDEX IF NOT EXISTS idx_parties_gstin ON parties (gstin);`,
        `CREATE INDEX IF NOT EXISTS idx_inventory_items_business_id_is_active ON inventory_items (business_id, is_active);`,
        `CREATE INDEX IF NOT EXISTS idx_inventory_items_sku_business_id ON inventory_items (sku, business_id);`,
        `CREATE INDEX IF NOT EXISTS idx_inventory_items_low_stock
            ON inventory_items (business_id, current_stock, low_stock_threshold)
            WHERE is_active = true;`,
        `CREATE INDEX IF NOT EXISTS idx_stock_movements_item_id_created_at ON stock_movements (item_id, created_at DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_stock_movements_business_id_created_at ON stock_movements (business_id, created_at DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_invoices_business_id_financial_year_date ON invoices (business_id, financial_year, invoice_date DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_invoices_party_id_payment_status ON invoices (party_id, payment_status);`,
        `CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices (payment_status);`,
        `CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices (invoice_date DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items (invoice_id);`,
        `CREATE INDEX IF NOT EXISTS idx_invoice_items_item_id ON invoice_items (item_id);`,
        `CREATE INDEX IF NOT EXISTS idx_ledger_entries_business_party_date ON ledger_entries (business_id, party_id, entry_date DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_ledger_entries_entry_date ON ledger_entries (entry_date DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_bank_accounts_business_id ON bank_accounts (business_id);`,
        `CREATE INDEX IF NOT EXISTS idx_payments_business_party ON payments (business_id, party_id);`,
        `CREATE INDEX IF NOT EXISTS idx_payments_bank_account_id_date ON payments (bank_account_id, payment_date DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_payments_is_reconciled ON payments (business_id, is_reconciled) WHERE is_reconciled = false;`,
        `CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON payment_allocations (payment_id);`,
        `CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice_id ON payment_allocations (invoice_id);`,
    ];

    for (const sql of indexes) {
        await pool.query(sql);
    }

    console.log("Schema patch + indexes applied");
    process.exit();
}

run();

