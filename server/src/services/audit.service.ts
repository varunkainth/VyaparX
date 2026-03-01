import { auditRepository } from "../repository/audit.repository";
import type { CreateAuditLogInput } from "../types/audit";
import { logger } from "../utils/logger";

export async function logAuditEvent(input: CreateAuditLogInput): Promise<void> {
    try {
        await auditRepository.create(input);
    } catch (error) {
        logger.warn(
            {
                action: input.action,
                entityType: input.entity_type,
                entityId: input.entity_id,
                businessId: input.business_id,
                actorUserId: input.actor_user_id,
                err: error,
            },
            "Failed to write audit log"
        );
    }
}

