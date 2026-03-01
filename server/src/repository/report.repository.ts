import pool from "../config/db";

export const reportRepository = {
    async getMonthlySales(args: { businessId: string; fromDate?: string; toDate?: string }) {
        const values: unknown[] = [args.businessId];
        const where: string[] = [
            "business_id = $1",
            "invoice_type = 'sales'::invoice_type",
            "is_cancelled = false",
        ];

        if (args.fromDate) {
            values.push(args.fromDate);
            where.push(`invoice_date >= $${values.length}::date`);
        }
        if (args.toDate) {
            values.push(args.toDate);
            where.push(`invoice_date <= $${values.length}::date`);
        }

        const result = await pool.query(
            `
            SELECT
                to_char(date_trunc('month', invoice_date), 'YYYY-MM') AS month,
                COUNT(*)::int AS invoice_count,
                COALESCE(SUM(taxable_amount), 0)::numeric(15,2) AS taxable_amount,
                COALESCE(SUM(total_tax), 0)::numeric(15,2) AS total_tax,
                COALESCE(SUM(grand_total), 0)::numeric(15,2) AS grand_total
            FROM invoices
            WHERE ${where.join(" AND ")}
            GROUP BY date_trunc('month', invoice_date)
            ORDER BY date_trunc('month', invoice_date) DESC
            `,
            values
        );

        return result.rows;
    },

    async getOutstandingSummary(businessId: string) {
        const summaryResult = await pool.query(
            `
            SELECT
                COALESCE(SUM(CASE WHEN current_balance > 0 THEN current_balance ELSE 0 END), 0)::numeric(15,2) AS total_receivable,
                COALESCE(SUM(CASE WHEN current_balance < 0 THEN ABS(current_balance) ELSE 0 END), 0)::numeric(15,2) AS total_payable
            FROM parties
            WHERE business_id = $1
              AND is_active = true
            `,
            [businessId]
        );

        const partiesResult = await pool.query(
            `
            SELECT id, name, party_type, phone, current_balance
            FROM parties
            WHERE business_id = $1
              AND is_active = true
              AND current_balance <> 0
            ORDER BY ABS(current_balance) DESC
            `,
            [businessId]
        );

        return {
            summary: summaryResult.rows[0],
            parties: partiesResult.rows,
        };
    },

    async getGstSummary(args: {
        businessId: string;
        fromDate?: string;
        toDate?: string;
        invoiceType?: "sales" | "purchase" | "credit_note" | "debit_note";
    }) {
        const values: unknown[] = [args.businessId];
        const where: string[] = ["business_id = $1", "is_cancelled = false"];

        if (args.invoiceType) {
            values.push(args.invoiceType);
            where.push(`invoice_type = $${values.length}::invoice_type`);
        } else {
            where.push("invoice_type = 'sales'::invoice_type");
        }
        if (args.fromDate) {
            values.push(args.fromDate);
            where.push(`invoice_date >= $${values.length}::date`);
        }
        if (args.toDate) {
            values.push(args.toDate);
            where.push(`invoice_date <= $${values.length}::date`);
        }

        const result = await pool.query(
            `
            SELECT
                COALESCE(SUM(taxable_amount), 0)::numeric(15,2) AS taxable_amount,
                COALESCE(SUM(cgst_amount), 0)::numeric(15,2) AS cgst_amount,
                COALESCE(SUM(sgst_amount), 0)::numeric(15,2) AS sgst_amount,
                COALESCE(SUM(igst_amount), 0)::numeric(15,2) AS igst_amount,
                COALESCE(SUM(total_tax), 0)::numeric(15,2) AS total_tax,
                COALESCE(SUM(grand_total), 0)::numeric(15,2) AS grand_total
            FROM invoices
            WHERE ${where.join(" AND ")}
            `,
            values
        );

        return result.rows[0];
    },

    async getLowStock(businessId: string) {
        const result = await pool.query(
            `
            SELECT
                id, name, sku, unit, current_stock, low_stock_threshold, selling_price
            FROM inventory_items
            WHERE business_id = $1
              AND is_active = true
              AND current_stock <= low_stock_threshold
            ORDER BY current_stock ASC, name ASC
            `,
            [businessId]
        );
        return result.rows;
    },
};
