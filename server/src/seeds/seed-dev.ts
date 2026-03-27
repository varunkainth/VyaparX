import pool from "../config/db";

const DEV_USER = {
    name: "Dev Owner",
    email: "dev.owner@vyaparx.local",
    phone: "9999990001",
    password: "Dev@12345",
};

const DEV_BUSINESS = {
    name: "VyaparX Demo Traders",
    gstin: "29ABCDE1234F1Z5",
    pan: "ABCDE1234F",
    state_code: "29",
    address_line1: "MG Road",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560001",
    phone: "9988776655",
    email: "billing@demo.vyaparx.local",
    invoice_prefix: "INV",
    purchase_prefix: "PUR",
    reset_numbering: "never",
    bank_name: "HDFC Bank",
    bank_account_no: "123456789012",
    bank_ifsc: "HDFC0001234",
    bank_branch: "MG Road",
};

async function run() {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const passwordHash = await Bun.password.hash(DEV_USER.password, {
            algorithm: "argon2id",
            memoryCost: 65536,
            timeCost: 3,
        });

        const userResult = await client.query<{ id: string }>(
            `
            INSERT INTO users (name, email, phone, password_hash, is_verified, is_active)
            VALUES ($1, $2, $3, $4, true, true)
            ON CONFLICT (email)
            DO UPDATE SET
                name = EXCLUDED.name,
                phone = EXCLUDED.phone,
                is_active = true,
                updated_at = now()
            RETURNING id
            `,
            [DEV_USER.name, DEV_USER.email, DEV_USER.phone, passwordHash]
        );
        const userId = userResult.rows[0]?.id;
        if (!userId) {
            throw new Error("Failed to upsert seed user");
        }

        const businessResult = await client.query<{ id: string }>(
            `
            INSERT INTO businesses (
                owner_id, name, gstin, pan, state_code, address_line1, city, state, pincode,
                phone, email, invoice_prefix, purchase_prefix, reset_numbering, bank_name, bank_account_no, bank_ifsc, bank_branch
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9,
                $10, $11, $12, $13, $14, $15, $16, $17, $18
            )
            ON CONFLICT (gstin)
            DO UPDATE SET
                owner_id = EXCLUDED.owner_id,
                name = EXCLUDED.name,
                phone = EXCLUDED.phone,
                email = EXCLUDED.email,
                updated_at = now()
            RETURNING id
            `,
            [
                userId,
                DEV_BUSINESS.name,
                DEV_BUSINESS.gstin,
                DEV_BUSINESS.pan,
                DEV_BUSINESS.state_code,
                DEV_BUSINESS.address_line1,
                DEV_BUSINESS.city,
                DEV_BUSINESS.state,
                DEV_BUSINESS.pincode,
                DEV_BUSINESS.phone,
                DEV_BUSINESS.email,
                DEV_BUSINESS.invoice_prefix,
                DEV_BUSINESS.purchase_prefix,
                DEV_BUSINESS.reset_numbering,
                DEV_BUSINESS.bank_name,
                DEV_BUSINESS.bank_account_no,
                DEV_BUSINESS.bank_ifsc,
                DEV_BUSINESS.bank_branch,
            ]
        );
        const businessId = businessResult.rows[0]?.id;
        if (!businessId) {
            throw new Error("Failed to upsert seed business");
        }

        await client.query(
            `
            INSERT INTO business_members (business_id, user_id, role, invited_by, is_active)
            VALUES ($1, $2, 'owner', $2, true)
            ON CONFLICT (business_id, user_id)
            DO UPDATE SET role = 'owner', is_active = true
            `,
            [businessId, userId]
        );

        const partyExists = await client.query<{ id: string }>(
            `
            SELECT id
            FROM parties
            WHERE business_id = $1
              AND name = $2
            LIMIT 1
            `,
            [businessId, "Acme Retail"]
        );

        if (partyExists.rowCount === 0) {
            await client.query(
                `
                INSERT INTO parties (
                    business_id, name, party_type, gstin, state_code, state, address, city, pincode,
                    phone, email, opening_balance, opening_balance_type, current_balance, notes, is_active
                )
                VALUES (
                    $1, $2, 'customer', $3, $4, $5, $6, $7, $8,
                    $9, $10, 0, 'none', 0, 'Seed party', true
                )
                `,
                [
                    businessId,
                    "Acme Retail",
                    "29AAAAA0000A1Z5",
                    "29",
                    "Karnataka",
                    "Indiranagar",
                    "Bengaluru",
                    "560038",
                    "9000000001",
                    "accounts@acme.local",
                ]
            );
        }

        const itemExists = await client.query<{ id: string }>(
            `
            SELECT id
            FROM inventory_items
            WHERE business_id = $1
              AND sku = $2
            LIMIT 1
            `,
            [businessId, "LED-9W"]
        );

        if (itemExists.rowCount === 0) {
            await client.query(
                `
                INSERT INTO inventory_items (
                    business_id, name, sku, hsn_code, unit, gst_rate, purchase_price, selling_price,
                    current_stock, low_stock_threshold, is_active
                )
                VALUES ($1, $2, $3, $4, $5, 18, 70, 100, 200, 10, true)
                `,
                [businessId, "LED Bulb 9W", "LED-9W", "9405", "pcs"]
            );
        }

        await client.query("COMMIT");

        console.log("Seed completed successfully");
        console.log(`User: ${DEV_USER.email} / ${DEV_USER.password}`);
        console.log(`Business ID: ${businessId}`);
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

run().catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
});
