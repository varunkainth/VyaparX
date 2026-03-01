import pool from "../config/db";

async function run() {
    await pool.query(`
        
        CREATE TABLE IF NOT EXISTS businesses (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid() ,
            
            owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

            name VARCHAR(255) NOT NULL,
            gstin VARCHAR(20) UNIQUE,
            pan VARCHAR(10),

            state_code VARCHAR(2) NOT NULL ,

            address_line1 TEXT NOT NULL,
            address_line2 TEXT ,
            city VARCHAR(100) NOT NULL,
            state VARCHAR(100) NOT NULL,
            pincode VARCHAR(6) NOT NULL,

            phone VARCHAR(15) NOT NULL,
            email VARCHAR(255) NOT NULL,
            website VARCHAR(255),

            logo_url TEXT,
            signature_url TEXT,
            
            invoice_prefix VARCHAR(10) DEFAULT 'INV',

            bank_name VARCHAR(100),
            bank_account_no VARCHAR(30),
            bank_ifsc_code VARCHAR(11),
            bank_branch VARCHAR(100),

            upi_id VARCHAR(100),

            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );

        `);

    console.log("Businesses table created successfully");
    process.exit();
}
run();