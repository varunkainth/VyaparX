import type { PoolClient } from "pg";

export const idempotencyRepository = {
    async insertInProgress(
        client: PoolClient,
        businessId: string,
        action: string,
        key: string,
        createdBy?: string
    ) {
        return client.query(
            `
            INSERT INTO idempotency_keys (
                business_id,
                action,
                idempotency_key,
                status,
                created_by
            )
            VALUES ($1, $2, $3, 'in_progress', $4)
            ON CONFLICT (business_id, action, idempotency_key) DO NOTHING
            RETURNING id
            `,
            [businessId, action, key, createdBy || null]
        );
    },

    async getByKeyForUpdate(client: PoolClient, businessId: string, action: string, key: string) {
        return client.query<{ status: string; response_json: unknown }>(
            `
            SELECT status, response_json
            FROM idempotency_keys
            WHERE business_id = $1
              AND action = $2
              AND idempotency_key = $3
            FOR UPDATE
            `,
            [businessId, action, key]
        );
    },

    async markCompleted(
        client: PoolClient,
        businessId: string,
        action: string,
        key: string,
        responseJson: string
    ) {
        return client.query(
            `
            UPDATE idempotency_keys
            SET status = 'completed',
                response_json = $1::jsonb,
                updated_at = now()
            WHERE business_id = $2
              AND action = $3
              AND idempotency_key = $4
            `,
            [responseJson, businessId, action, key]
        );
    },
};
