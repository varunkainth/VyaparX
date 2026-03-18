import pool from "../config/db";
import type { PoolClient } from "pg";
import type { CreateNotificationInput } from "../types/notification";

const getDb = (client?: PoolClient) => client ?? pool;

export const notificationRepository = {
    async listActiveForUser(businessId: string, userId: string, client?: PoolClient) {
        const db = getDb(client);
        const result = await db.query(
            `
            SELECT *
            FROM notifications
            WHERE business_id = $1
              AND user_id = $2
              AND is_resolved = false
            ORDER BY created_at DESC
            `,
            [businessId, userId]
        );

        return result.rows;
    },

    async findActiveByDedupeKey(
        businessId: string,
        userId: string,
        dedupeKey: string,
        client?: PoolClient
    ) {
        const db = getDb(client);
        const result = await db.query(
            `
            SELECT *
            FROM notifications
            WHERE business_id = $1
              AND user_id = $2
              AND dedupe_key = $3
              AND is_resolved = false
            ORDER BY created_at DESC
            LIMIT 1
            `,
            [businessId, userId, dedupeKey]
        );

        return result.rows[0] ?? null;
    },

    async createNotification(input: CreateNotificationInput, client?: PoolClient) {
        const db = getDb(client);
        const result = await db.query(
            `
            INSERT INTO notifications (
                business_id,
                user_id,
                type,
                priority,
                title,
                message,
                link,
                metadata,
                dedupe_key
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
            RETURNING *
            `,
            [
                input.business_id,
                input.user_id,
                input.type,
                input.priority,
                input.title,
                input.message,
                input.link ?? null,
                JSON.stringify(input.metadata ?? {}),
                input.dedupe_key ?? null,
            ]
        );

        return result.rows[0];
    },

    async resolveByDedupeKey(businessId: string, dedupeKey: string, client?: PoolClient) {
        const db = getDb(client);
        await db.query(
            `
            UPDATE notifications
            SET is_resolved = true,
                resolved_at = now(),
                updated_at = now()
            WHERE business_id = $1
              AND dedupe_key = $2
              AND is_resolved = false
            `,
            [businessId, dedupeKey]
        );
    },

    async markAsRead(businessId: string, userId: string, notificationId: string) {
        const result = await pool.query(
            `
            UPDATE notifications
            SET read = true,
                updated_at = now()
            WHERE business_id = $1
              AND user_id = $2
              AND id = $3
            RETURNING *
            `,
            [businessId, userId, notificationId]
        );

        return result.rows[0] ?? null;
    },

    async markAllAsRead(businessId: string, userId: string) {
        await pool.query(
            `
            UPDATE notifications
            SET read = true,
                updated_at = now()
            WHERE business_id = $1
              AND user_id = $2
              AND is_resolved = false
              AND read = false
            `,
            [businessId, userId]
        );
    },

    async clearNotification(businessId: string, userId: string, notificationId: string) {
        const result = await pool.query(
            `
            UPDATE notifications
            SET is_resolved = true,
                resolved_at = now(),
                updated_at = now()
            WHERE business_id = $1
              AND user_id = $2
              AND id = $3
            RETURNING *
            `,
            [businessId, userId, notificationId]
        );

        return result.rows[0] ?? null;
    },
};
