import pool from "../config/db";
import type { PoolClient } from "pg";

const getDb = (client?: PoolClient) => client ?? pool;

export const invoiceRepository = {
    async nextInvoiceSequence(
        client: PoolClient,
        businessId: string,
        financialYear: string,
        invoiceType: "sales" | "purchase"
    ) {
        const result = await client.query(
            `
            INSERT INTO invoice_sequences (business_id, financial_year, invoice_type, last_sequence_no)
            VALUES ($1, $2, $3::invoice_type, 1)
            ON CONFLICT (business_id, financial_year, invoice_type)
            DO UPDATE SET last_sequence_no = invoice_sequences.last_sequence_no + 1
            RETURNING last_sequence_no
            `,
            [businessId, financialYear, invoiceType]
        );
        return result.rows[0].last_sequence_no as number;
    },

    async insertInvoice(
        client: PoolClient,
        values: {
            business_id: string;
            party_id: string;
            invoice_type: "sales" | "purchase";
            invoice_number: string;
            financial_year: string;
            invoice_date: string;
            place_of_supply: string;
            is_igst: boolean;
            subtotal: number;
            taxable_amount: number;
            cgst_amount: number;
            sgst_amount: number;
            igst_amount: number;
            total_tax: number;
            round_off?: number;
            grand_total: number;
            payment_status?: "unpaid" | "partial" | "paid" | "overdue";
            created_by: string;
            reference_invoice_id?: string | null;
            note_reason?: string | null;
        }
    ) {
        const paymentStatus = values.payment_status ?? "unpaid";
        const result = await client.query(
            `
            INSERT INTO invoices (
                business_id,party_id,invoice_type,invoice_number,financial_year,invoice_date,place_of_supply,is_igst,
                subtotal,taxable_amount,cgst_amount,sgst_amount,igst_amount,total_tax,round_off,grand_total,balance_due,payment_status,reference_invoice_id,note_reason,created_by
            )
            VALUES ($1,$2,$3::invoice_type,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::payment_status,$19,$20,$21)
            RETURNING id
            `,
            [
                values.business_id,
                values.party_id,
                values.invoice_type,
                values.invoice_number,
                values.financial_year,
                values.invoice_date,
                values.place_of_supply,
                values.is_igst,
                values.subtotal,
                values.taxable_amount,
                values.cgst_amount,
                values.sgst_amount,
                values.igst_amount,
                values.total_tax,
                values.round_off ?? 0,
                values.grand_total,
                values.grand_total,
                paymentStatus,
                values.reference_invoice_id ?? null,
                values.note_reason ?? null,
                values.created_by,
            ]
        );
        return result.rows[0].id as string;
    },

    async insertInvoiceItem(client: PoolClient, values: unknown[]) {
        await client.query(
            `
            INSERT INTO invoice_items (
                invoice_id,item_id,item_name,hsn_code,price_mode,unit,quantity,unit_price,discount_pct,discount_amount,
                taxable_value,gst_rate,cgst_rate,sgst_rate,igst_rate,cgst_amount,sgst_amount,igst_amount,total_amount
            )
            VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
            )
            `,
            values
        );
    },

    async lockItemStock(client: PoolClient, itemId: string) {
        const result = await client.query(
            `
            SELECT id, business_id, name, unit, current_stock, low_stock_threshold
            FROM inventory_items
            WHERE id = $1
            FOR UPDATE
            `,
            [itemId]
        );
        return result.rows[0] ?? null;
    },

    async decrementItemStock(client: PoolClient, itemId: string, quantity: number) {
        await client.query(
            `
            UPDATE inventory_items
            SET current_stock = current_stock - $1
            WHERE id = $2
            `,
            [quantity, itemId]
        );
    },

    async incrementItemStock(client: PoolClient, itemId: string, quantity: number) {
        await client.query(
            `
            UPDATE inventory_items
            SET current_stock = current_stock + $1
            WHERE id = $2
            `,
            [quantity, itemId]
        );
    },

    async insertStockMovement(client: PoolClient, values: unknown[]) {
        await client.query(
            `
            INSERT INTO stock_movements (
                business_id,item_id,movement_type,quantity,direction,reference_type,reference_id,created_by,notes
            )
            VALUES ($1,$2,$3::movement_type,$4,$5::direction,$6::reference_type,$7,$8,$9)
            `,
            values
        );
    },

    async lockPartyBalance(client: PoolClient, partyId: string) {
        const result = await client.query(
            `SELECT current_balance FROM parties WHERE id = $1 FOR UPDATE`,
            [partyId]
        );
        return result.rows[0] ?? null;
    },

    async insertLedgerEntry(client: PoolClient, values: unknown[]) {
        await client.query(
            `
            INSERT INTO ledger_entries (
                business_id,party_id,entry_type,debit,credit,balance_after,reference_type,reference_id,description,entry_date,created_by
            )
            VALUES ($1,$2,$3::entry_type,$4,$5,$6,$7::reference_type,$8,$9,$10,$11)
            `,
            values
        );
    },

    async updatePartyBalance(client: PoolClient, partyId: string, balance: number) {
        await client.query(`UPDATE parties SET current_balance = $1 WHERE id = $2`, [balance, partyId]);
    },

    async listInvoices(query: string, values: unknown[]) {
        return pool.query(query, values);
    },

    async getInvoiceById(businessId: string, invoiceId: string) {
        const result = await pool.query(
            `
            SELECT i.*, p.name AS party_name, p.email AS party_email
            FROM invoices i
            JOIN parties p ON p.id = i.party_id
            WHERE business_id = $1
              AND i.id = $2
            `,
            [businessId, invoiceId]
        );
        return result.rows[0] ?? null;
    },

    async getInvoiceItems(invoiceId: string) {
        const result = await pool.query(
            `
            SELECT *
            FROM invoice_items
            WHERE invoice_id = $1
            ORDER BY sort_order ASC, id ASC
            `,
            [invoiceId]
        );
        return result.rows;
    },

    async getInvoiceSummary(businessId: string, invoiceId: string) {
        const result = await pool.query(
            `
            SELECT id, invoice_number, invoice_type, is_cancelled
            FROM invoices
            WHERE business_id = $1
              AND id = $2
            `,
            [businessId, invoiceId]
        );
        return result.rows[0] ?? null;
    },

    async getFirstReferencingInvoice(businessId: string, referenceInvoiceId: string) {
        const result = await pool.query(
            `
            SELECT id, invoice_number, invoice_type, is_cancelled
            FROM invoices
            WHERE business_id = $1
              AND reference_invoice_id = $2
            ORDER BY created_at DESC
            LIMIT 1
            `,
            [businessId, referenceInvoiceId]
        );
        return result.rows[0] ?? null;
    },

    async getReferencingInvoices(businessId: string, referenceInvoiceId: string) {
        const result = await pool.query(
            `
            SELECT id, invoice_number, invoice_type, is_cancelled, created_at
            FROM invoices
            WHERE business_id = $1
              AND reference_invoice_id = $2
            ORDER BY created_at DESC
            `,
            [businessId, referenceInvoiceId]
        );
        return result.rows;
    },

    async getInvoicePayments(businessId: string, invoiceId: string) {
        const result = await pool.query(
            `
            SELECT
                p.id,
                p.payment_type,
                p.payment_mode,
                p.payment_date,
                p.bank_ref_no,
                p.is_reconciled,
                p.created_at,
                pa.allocated_amount,
                parties.name AS party_name
            FROM payment_allocations pa
            JOIN payments p ON p.id = pa.payment_id
            JOIN parties ON parties.id = p.party_id
            WHERE p.business_id = $1
              AND pa.invoice_id = $2
            ORDER BY p.payment_date DESC, p.created_at DESC
            `,
            [businessId, invoiceId]
        );
        return result.rows;
    },

    async lockInvoiceForCancel(client: PoolClient, businessId: string, invoiceId: string) {
        const result = await client.query(
            `
            SELECT *
            FROM invoices
            WHERE business_id = $1
              AND id = $2
            FOR UPDATE
            `,
            [businessId, invoiceId]
        );
        return result.rows[0] ?? null;
    },

    async getInvoiceItemsForCancel(client: PoolClient, invoiceId: string) {
        const result = await client.query(
            `
            SELECT item_id, item_name, quantity
            FROM invoice_items
            WHERE invoice_id = $1
            `,
            [invoiceId]
        );
        return result.rows;
    },

    async markCancelled(
        client: PoolClient,
        cancelledBy: string,
        cancelReason: string | null,
        invoiceId: string
    ) {
        await client.query(
            `
            UPDATE invoices
            SET is_cancelled = true,
                cancelled_at = now(),
                cancelled_by = $1,
                cancel_reason = $2,
                updated_at = now()
            WHERE id = $3
            `,
            [cancelledBy, cancelReason, invoiceId]
        );
    },
};
