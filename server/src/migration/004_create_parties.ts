import pool from "../config/db";

async function run() {
    await pool.query(`
        
        CREATE TABLE IF NOT EXISTS parties(
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

        name VARCHAR(150) NOT NULL,
        party_type party_type NOT NULL,

        gstin VARCHAR(100),
        pan VARCHAR(10),

        state_code VARCHAR(2),
        state VARCHAR(100),

        address TEXT,
        city VARCHAR(100),
        pincode VARCHAR(6),

        phone VARCHAR(10),
        email VARCHAR(100),

        opening_balance NUMERIC(15,2) DEFAULT 0,
        opening_balance_type ob_type DEFAULT 'none',

        current_balance NUMERIC(15,2) DEFAULT 0,

        notes TEXT,
        is_active BOOLEAN DEFAULT true,

        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
        );

        `);

    console.log("Parties Table Created Successfully");
    process.exit();

}

run();