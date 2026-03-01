import pool from "../config/db";

async function run() {
    await pool.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_item_price_mode') THEN
                CREATE TYPE invoice_item_price_mode AS ENUM ('exclusive', 'inclusive');
            END IF;
        END
        $$;

        ALTER TABLE invoice_items
        ADD COLUMN IF NOT EXISTS price_mode invoice_item_price_mode NOT NULL DEFAULT 'exclusive';
    `);

    console.log("Invoice item price_mode column added");
    process.exit();
}

run();
