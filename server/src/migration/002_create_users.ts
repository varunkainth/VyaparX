import pool from "../config/db";

async function run() {
    await pool.query(`

        CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL ,
        phone VARCHAR(20) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name VARCHAR(255) NOT NULL,
        isVerified BOOLEAN DEFAULT false,
        updated_at TIMESTAMP DEFAULT now(),
        created_at TIMESTAMP DEFAULT now()
        );

        `);
    console.log("Users table created successfully");
    process.exit();
}

run();