export interface CreateAuditLogInput {
    business_id?: string;
    actor_user_id?: string;
    action: string;
    entity_type: string;
    entity_id?: string;
    metadata?: Record<string, unknown>;
}

