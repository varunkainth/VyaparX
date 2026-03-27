import pool from "../config/db";
import type { PoolClient } from "pg";

const getDb = (client?: PoolClient) => client ?? pool;

export const paymentRepository = {
    async insertPayment(client: PoolClient, values: unknown[]) {
        const result = await client.query(
            `
            INSERT INTO payments(
                business_id,party_id,payment_type,amount,payment_date,payment_mode,
                upi_ref,cheque_no,cheque_date,bank_account_id,bank_ref_no,bank_statement_date,
                is_reconciled,reconciled_at,reconciled_by,notes,created_by
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
            RETURNING id
            `,
            values
        );
        return result.rows[0].id as string;
    },

    async lockInvoiceForPayment(client: PoolClient, invoiceId: string) {
        const result = await client.query(
            `
            SELECT id, business_id, party_id, amount_paid, balance_due, is_cancelled
            FROM invoices
            WHERE id = $1
            FOR UPDATE
            `,
            [invoiceId]
        );
        return result.rows[0] ?? null;
    },

    async insertAllocation(client: PoolClient, paymentId: string, invoiceId: string, amount: number) {
        await client.query(
            `
            INSERT INTO payment_allocations (
                payment_id,invoice_id,allocated_amount
            )
            VALUES ($1,$2,$3)
            `,
            [paymentId, invoiceId, amount]
        );
    },

    async updateInvoicePaymentState(
        client: PoolClient,
        invoiceId: string,
        amountPaid: number,
        balanceDue: number,
        paymentStatus: "paid" | "partial"
    ) {
        await client.query(
            `
            UPDATE invoices
            SET amount_paid = $1,
                balance_due = $2,
                payment_status = $3::payment_status
            WHERE id = $4
            `,
            [amountPaid, balanceDue, paymentStatus, invoiceId]
        );
    },

    async lockPartyBalance(client: PoolClient, partyId: string) {
        const result = await client.query(
            `SELECT current_balance FROM parties WHERE id = $1 FOR UPDATE`,
            [partyId]
        );
        return result.rows[0] ?? null;
    },

    async insertLedgerPayment(client: PoolClient, values: unknown[]) {
        await client.query(
            `
            INSERT INTO ledger_entries(
                business_id,party_id,entry_type,debit,credit,balance_after,description,entry_date,created_by
            )
            VALUES($1,$2,'payment',$3,$4,$5,$6,$7,$8)
            `,
            values
        );
    },

    async updatePartyBalance(client: PoolClient, partyId: string, balance: number) {
        await client.query(
            `
            UPDATE parties
            SET current_balance = $1
            WHERE id = $2
            `,
            [balance, partyId]
        );
    },

    async updateBankBalance(
        client: PoolClient,
        paymentType: "received" | "made",
        amount: number,
        bankAccountId: string
    ) {
        const bankUpdate =
            paymentType === "received"
                ? `current_balance = current_balance + $1`
                : `current_balance = current_balance - $1`;

        await client.query(
            `
            UPDATE bank_accounts
            SET ${bankUpdate}
            WHERE id = $2
            `,
            [amount, bankAccountId]
        );
    },

    async listPayments(query: string, values: unknown[]) {
        return pool.query(query, values);
    },

    async getPayment(businessId: string, paymentId: string) {
        const result = await pool.query(
            `
            SELECT p.*, pa.name AS party_name
            FROM payments p
            JOIN parties pa ON pa.id = p.party_id
            WHERE p.business_id = $1
              AND p.id = $2
            `,
            [businessId, paymentId]
        );
        return result.rows[0] ?? null;
    },

    async getAllocations(paymentId: string) {
        const result = await pool.query(
            `
            SELECT
                a.*,
                i.invoice_number,
                i.invoice_date,
                i.grand_total
            FROM payment_allocations a
            JOIN invoices i ON i.id = a.invoice_id
            WHERE a.payment_id = $1
            ORDER BY a.created_at ASC
            `,
            [paymentId]
        );
        return result.rows;
    },

    async reconcile(args: {
        reconciled_by: string;
        bank_statement_date?: string | null;
        bank_ref_no?: string | null;
        notes?: string | null;
        business_id: string;
        payment_id: string;
        client?: PoolClient;
    }) {
        const db = args.client ?? pool;
        return db.query(
            `
            UPDATE payments
            SET
                is_reconciled = true,
                reconciled_at = now(),
                reconciled_by = $1,
                bank_statement_date = COALESCE($2::date, bank_statement_date),
                bank_ref_no = COALESCE($3, bank_ref_no),
                notes = COALESCE($4, notes),
                updated_at = now()
            WHERE business_id = $5
              AND id = $6
              AND is_reconciled = false
            RETURNING *
            `,
            [
                args.reconciled_by,
                args.bank_statement_date ?? null,
                args.bank_ref_no ?? null,
                args.notes ?? null,
                args.business_id,
                args.payment_id,
            ]
        );
    },

    async unreconcile(businessId: string, paymentId: string) {
        return pool.query(
            `
            UPDATE payments
            SET
                is_reconciled = false,
                reconciled_at = null,
                reconciled_by = null,
                updated_at = now()
            WHERE business_id = $1
              AND id = $2
              AND is_reconciled = true
            RETURNING *
            `,
            [businessId, paymentId]
        );
    },

    async getPaymentState(businessId: string, paymentId: string) {
        const result = await pool.query(
            `
            SELECT id, is_reconciled
            FROM payments
            WHERE business_id = $1
              AND id = $2
            `,
            [businessId, paymentId]
        );
        return result.rows[0] ?? null;
    },
};
