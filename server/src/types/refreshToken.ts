import type { PoolClient } from "pg";

export interface CreateRefreshTokenInput {
    tokenId: string;
    userId: string;
    businessId?: string;
    expiresAt: Date;
    client?: PoolClient;
}

export interface RefreshTokenRecord {
    id: string;
    token_id: string;
    user_id: string;
    business_id: string | null;
    expires_at: string;
    revoked_at: string | null;
    replaced_by_token_id: string | null;
    created_at: string;
}

