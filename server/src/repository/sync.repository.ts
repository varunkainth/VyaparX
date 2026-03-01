import pool from "../config/db";

export interface SyncMutationRecord {
    id: string;
    business_id: string;
    device_id: string;
    client_mutation_id: string;
    entity_type: string;
    operation: string;
    entity_id: string | null;
    status: "applied" | "duplicate" | "conflict" | "error";
    error_code: string | null;
    error_message: string | null;
    request_hash: string | null;
    response_json: unknown;
}

export const syncRepository = {
    async getMutation(
        businessId: string,
        deviceId: string,
        clientMutationId: string
    ) {
        const result = await pool.query<SyncMutationRecord>(
            `
            SELECT *
            FROM sync_mutations
            WHERE business_id = $1
              AND device_id = $2
              AND client_mutation_id = $3
            `,
            [businessId, deviceId, clientMutationId]
        );
        return result.rows[0] ?? null;
    },

    async insertMutation(args: {
        businessId: string;
        deviceId: string;
        clientMutationId: string;
        entityType: string;
        operation: string;
        entityId?: string;
        requestJson?: Record<string, unknown>;
        requestHash?: string;
        responseJson?: Record<string, unknown>;
        status: "applied" | "conflict" | "error";
        errorCode?: string;
        errorMessage?: string;
    }) {
        await pool.query(
            `
            INSERT INTO sync_mutations (
                business_id, device_id, client_mutation_id, entity_type, operation, entity_id,
                request_json, request_hash, response_json, status, error_code, error_message, applied_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CASE WHEN $10 = 'applied' THEN now() ELSE NULL END)
            `,
            [
                args.businessId,
                args.deviceId,
                args.clientMutationId,
                args.entityType,
                args.operation,
                args.entityId ?? null,
                args.requestJson ? JSON.stringify(args.requestJson) : null,
                args.requestHash ?? null,
                args.responseJson ? JSON.stringify(args.responseJson) : null,
                args.status,
                args.errorCode ?? null,
                args.errorMessage ?? null,
            ]
        );
    },

    async insertChange(args: {
        businessId: string;
        entityType: string;
        entityId: string;
        operation: string;
        payload?: Record<string, unknown>;
    }) {
        await pool.query(
            `
            INSERT INTO sync_changes (business_id, entity_type, entity_id, operation, payload)
            VALUES ($1, $2, $3, $4, $5)
            `,
            [
                args.businessId,
                args.entityType,
                args.entityId,
                args.operation,
                args.payload ? JSON.stringify(args.payload) : null,
            ]
        );
    },

    async listChanges(args: { businessId: string; since: number; limit: number }) {
        const result = await pool.query(
            `
            SELECT id, entity_type, entity_id, operation, payload, changed_at
            FROM sync_changes
            WHERE business_id = $1
              AND id > $2
            ORDER BY id ASC
            LIMIT $3
            `,
            [args.businessId, args.since, args.limit]
        );
        return result.rows;
    },
};
