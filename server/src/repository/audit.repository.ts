import pool from "../config/db";
import type { CreateAuditLogInput } from "../types/audit";

export const auditRepository = {
    async create(input: CreateAuditLogInput) {
        await pool.query(
            `
            INSERT INTO audit_logs (
                business_id, actor_user_id, action, entity_type, entity_id, metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            `,
            [
                input.business_id ?? null,
                input.actor_user_id ?? null,
                input.action,
                input.entity_type,
                input.entity_id ?? null,
                input.metadata ? JSON.stringify(input.metadata) : null,
            ]
        );
    },
};

