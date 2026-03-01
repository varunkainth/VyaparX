import pool from "../config/db";

async function run() {
    await pool.query(`
    ALTER TABLE users DROP COLUMN role;
`);
    console.log("Role column Deleted Successfully")
    process.exit();

}

run();