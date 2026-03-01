import pool from "../config/db";
import type {
    AnalyticsEventRecord,
    AnalyticsEventTypeCount,
    AnalyticsRollupRecord,
    AnalyticsRollupSummary,
    CreateAnalyticsEventInput,
} from "../types/analytics";

const extractNumericField = (field: string) => `COALESCE((event_data ->> ${field})::numeric, 0)`;

export const analyticsRepository = {
    async createEvent(input: CreateAnalyticsEventInput) {
        await pool.query(
            `
            INSERT INTO analytics_events (
                business_id, event_type, entity_type, entity_id, actor_user_id, occurred_at, event_data
            )
            VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, now()), $7)
            `,
            [
                input.business_id,
                input.event_type,
                input.entity_type ?? null,
                input.entity_id ?? null,
                input.actor_user_id ?? null,
                input.occurred_at ?? null,
                input.event_data ? JSON.stringify(input.event_data) : null,
            ]
        );
    },

    async listEvents(businessId: string, limit = 20) {
        const result = await pool.query(
            `
            SELECT id, business_id, event_type, entity_type, entity_id, actor_user_id, occurred_at, event_data
            FROM analytics_events
            WHERE business_id = $1
            ORDER BY occurred_at DESC
            LIMIT $2
            `,
            [businessId, limit]
        );
        return result.rows as AnalyticsEventRecord[];
    },

    async countEventsByType(businessId: string, since?: string) {
        const params: unknown[] = [businessId];
        let query = `
            SELECT event_type, COUNT(*)::int AS count
            FROM analytics_events
            WHERE business_id = $1
        `;
        if (since) {
            params.push(since);
            query += ` AND occurred_at >= $${params.length}`;
        }
        query += `
            GROUP BY event_type
            ORDER BY count DESC
        `;
        const result = await pool.query(query, params);
        return result.rows.map((row) => ({
            event_type: row.event_type,
            count: Number(row.count),
        })) as AnalyticsEventTypeCount[];
    },

    async sumEventField(businessId: string, eventType: string, fieldKey: string, since?: string) {
        const params: unknown[] = [businessId, eventType, fieldKey];
        let query = `
            SELECT COALESCE(SUM((event_data ->> $3)::numeric), 0) AS total
            FROM analytics_events
            WHERE business_id = $1
              AND event_type = $2
        `;
        if (since) {
            params.push(since);
            query += ` AND occurred_at >= $${params.length}`;
        }
        const result = await pool.query(query, params);
        return result.rows[0]?.total ?? "0";
    },

    async aggregateEvents(params: { businessId?: string; since?: string; until?: string } = {}) {
        const conditions: string[] = [];
        const values: unknown[] = [];

        if (params.businessId) {
            values.push(params.businessId);
            conditions.push(`business_id = $${values.length}`);
        }

        if (params.since) {
            values.push(params.since);
            conditions.push(`occurred_at >= $${values.length}`);
        }

        if (params.until) {
            values.push(params.until);
            conditions.push(`occurred_at < $${values.length}`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

        const query = `
            SELECT business_id,
                   occurred_at::date AS event_date,
                   event_type,
                   COUNT(*) AS event_count,
                   SUM(
                       CASE
                           WHEN event_type = 'invoice_created' THEN ${extractNumericField("'grand_total'")}
                           ELSE 0
                       END
                   ) AS invoice_amount,
                   SUM(
                       CASE
                           WHEN event_type = 'payment_recorded' THEN ${extractNumericField("'amount'")}
                           ELSE 0
                       END
                   ) AS payment_amount
            FROM analytics_events
            ${whereClause}
            GROUP BY business_id, event_date, event_type
            ORDER BY event_date DESC, business_id, event_type
        `;

        const result = await pool.query(query, values);
        return result.rows.map((row) => ({
            business_id: row.business_id,
            event_date: row.event_date,
            event_type: row.event_type,
            event_count: Number(row.event_count),
            invoice_amount: Number(row.invoice_amount ?? 0),
            payment_amount: Number(row.payment_amount ?? 0),
        })) as AnalyticsRollupSummary[];
    },

    async upsertRollups(rollups: AnalyticsRollupSummary[]) {
        if (rollups.length === 0) {
            return;
        }

        const values: unknown[] = [];
        const placeholders = rollups
            .map((row, index) => {
                const base = index * 6;
                values.push(
                    row.business_id,
                    row.event_date,
                    row.event_type,
                    row.event_count,
                    row.invoice_amount,
                    row.payment_amount
                );
                return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`;
            })
            .join(", ");

        await pool.query(
            `
            INSERT INTO analytics_rollups (
                business_id, event_date, event_type, event_count, invoice_amount, payment_amount
            )
            VALUES ${placeholders}
            ON CONFLICT (business_id, event_date, event_type)
            DO UPDATE SET
                event_count = EXCLUDED.event_count,
                invoice_amount = EXCLUDED.invoice_amount,
                payment_amount = EXCLUDED.payment_amount,
                updated_at = now()
        `,
            values
        );
    },

    async listRollups(businessId: string, fromDate?: string, toDate?: string) {
        const conditions = ["business_id = $1"];
        const values: unknown[] = [businessId];

        if (fromDate) {
            values.push(fromDate);
            conditions.push(`event_date >= $${values.length}`);
        }

        if (toDate) {
            values.push(toDate);
            conditions.push(`event_date <= $${values.length}`);
        }

        const result = await pool.query(
            `
            SELECT *
            FROM analytics_rollups
            WHERE ${conditions.join(" AND ")}
            ORDER BY event_date DESC, event_type ASC
            `,
            values
        );
        return result.rows as AnalyticsRollupRecord[];
    },
};
