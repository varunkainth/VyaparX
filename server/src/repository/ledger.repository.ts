import pool from "../config/db";
import type { LedgerStatementInput } from "../types/ledger";

export const ledgerRepository = {
    async getStatement(input: LedgerStatementInput) {
        const values: unknown[] = [input.business_id];
        const where: string[] = ["l.business_id = $1"];

        if (input.party_id) {
            values.push(input.party_id);
            where.push(`l.party_id = $${values.length}`);
        }
        if (input.from_date) {
            values.push(input.from_date);
            where.push(`l.entry_date >= $${values.length}::date`);
        }
        if (input.to_date) {
            values.push(input.to_date);
            where.push(`l.entry_date <= $${values.length}::date`);
        }

        const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
        const page = Math.max(input.page ?? 1, 1);
        const offset = (page - 1) * limit;

        values.push(limit);
        const limitParam = values.length;
        values.push(offset);
        const offsetParam = values.length;

        const query = `
            SELECT
                l.*,
                p.name AS party_name,
                COUNT(*) OVER() AS total_count
            FROM ledger_entries l
            JOIN parties p ON p.id = l.party_id
            WHERE ${where.join(" AND ")}
            ORDER BY l.entry_date DESC, l.created_at DESC
            LIMIT $${limitParam}
            OFFSET $${offsetParam}
        `;

        const result = await pool.query(query, values);
        const total = result.rows.length > 0 ? Number(result.rows[0].total_count) : 0;
        const items = result.rows.map(({ total_count, ...row }) => row);

        return {
            items,
            pagination: { page, limit, total },
        };
    },
};
