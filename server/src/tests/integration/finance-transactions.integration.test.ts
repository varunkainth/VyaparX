import { afterAll, describe, expect, test } from "bun:test";
import pool from "../../config/db";
import { createSaleInvoice } from "../../services/invoice.service";
import { recordPayment } from "../../services/payment.service";

const uid = () => crypto.randomUUID();

const resources: {
    businessId?: string;
    userId?: string;
    partyId?: string;
    itemId?: string;
    invoiceId?: string;
    paymentId?: string;
} = {};

const setupFixture = async () => {
    const userId = uid();
    const businessId = uid();
    const partyId = uid();
    const itemId = uid();
    const now = new Date().toISOString().slice(0, 10);
    const uniqueTag = Date.now().toString().slice(-8);

    await pool.query(
        `
        INSERT INTO users (id, name, email, phone, password_hash, is_verified, is_active, token_version)
        VALUES ($1, $2, $3, $4, $5, true, true, 1)
        `,
        [userId, "Integration User", `int.${uniqueTag}@vyaparx.local`, `98989${uniqueTag.slice(-5)}`, "seed_hash"]
    );

    await pool.query(
        `
        INSERT INTO businesses (
            id, owner_id, name, state_code, address_line1, city, state, pincode, phone, email
        )
        VALUES ($1, $2, $3, '29', 'MG Road', 'Bengaluru', 'Karnataka', '560001', '9999999999', $4)
        `,
        [businessId, userId, "Integration Biz", `biz.${uniqueTag}@vyaparx.local`]
    );

    await pool.query(
        `
        INSERT INTO business_members (business_id, user_id, role, invited_by, is_active)
        VALUES ($1, $2, 'owner', $2, true)
        ON CONFLICT (business_id, user_id) DO NOTHING
        `,
        [businessId, userId]
    );

    await pool.query(
        `
        INSERT INTO parties (
            id, business_id, name, party_type, phone, opening_balance, opening_balance_type, current_balance, is_active
        )
        VALUES ($1, $2, 'Integration Party', 'customer', '9000012345', 0, 'none', 0, true)
        `,
        [partyId, businessId]
    );

    await pool.query(
        `
        INSERT INTO inventory_items (
            id, business_id, name, sku, unit, gst_rate, purchase_price, selling_price, current_stock, low_stock_threshold, is_active
        )
        VALUES ($1, $2, 'Integration Item', 'INT-SKU', 'pcs', 18, 70, 100, 100, 5, true)
        `,
        [itemId, businessId]
    );

    resources.userId = userId;
    resources.businessId = businessId;
    resources.partyId = partyId;
    resources.itemId = itemId;

    return { userId, businessId, partyId, itemId, now };
};

describe("invoice/payment transaction integration", () => {
    test(
        "creates invoice and fully settles it with payment",
        async () => {
        const { userId, businessId, partyId, itemId, now } = await setupFixture();

        const invoiceResult = await createSaleInvoice({
            business_id: businessId,
            party_id: partyId,
            invoice_date: now,
            place_of_supply: "29",
            is_igst: false,
            subtotal: 100,
            taxable_amount: 100,
            total_tax: 18,
            grand_total: 118,
            created_by: userId,
            idempotency_key: `invoice-${uid()}`,
            items: [
                {
                    item_id: itemId,
                    item_name: "Integration Item",
                    hsn_code: "9405",
                    unit: "pcs",
                    quantity: 1,
                    unit_price: 100,
                    discount_pct: 0,
                    taxable_value: 100,
                    gst_rate: 18,
                    cgst_rate: 9,
                    sgst_rate: 9,
                    igst_rate: 0,
                    cgst_amount: 9,
                    sgst_amount: 9,
                    igst_amount: 0,
                    total_amount: 118,
                },
            ],
        });

        expect(invoiceResult.success).toBe(true);
        resources.invoiceId = invoiceResult.invoice_id;

        const paymentResult = await recordPayment({
            business_id: businessId,
            party_id: partyId,
            payment_type: "received",
            amount: 118,
            payment_date: now,
            payment_mode: "cash",
            allocations: [{ invoice_id: invoiceResult.invoice_id, allocated_amount: 118 }],
            createdBy: userId,
            idempotency_key: `payment-${uid()}`,
        });

        expect(paymentResult.success).toBe(true);
        resources.paymentId = paymentResult.payment_id;

        const invoiceRow = await pool.query<{ payment_status: string; balance_due: string }>(
            `SELECT payment_status, balance_due FROM invoices WHERE id = $1`,
            [invoiceResult.invoice_id]
        );
        expect(invoiceRow.rows[0]?.payment_status).toBe("paid");
        expect(Number(invoiceRow.rows[0]?.balance_due ?? 1)).toBe(0);

        const partyRow = await pool.query<{ current_balance: string }>(
            `SELECT current_balance FROM parties WHERE id = $1`,
            [partyId]
        );
        expect(Number(partyRow.rows[0]?.current_balance ?? 1)).toBe(0);
        },
        20000
    );
});

afterAll(async () => {
    try {
        if (resources.paymentId) {
            await pool.query(`DELETE FROM payments WHERE id = $1`, [resources.paymentId]);
        }
        if (resources.invoiceId) {
            await pool.query(`DELETE FROM invoices WHERE id = $1`, [resources.invoiceId]);
        }
        if (resources.businessId) {
            await pool.query(`DELETE FROM businesses WHERE id = $1`, [resources.businessId]);
        }
        if (resources.userId) {
            await pool.query(`DELETE FROM users WHERE id = $1`, [resources.userId]);
        }
    } finally {
        await pool.end();
    }
});
