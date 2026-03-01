import type { PoolClient } from "pg";

export interface StartIdempotentOperationArgs {
    client: PoolClient;
    businessId: string;
    action: string;
    key?: string;
    createdBy?: string;
}

export interface StartIdempotentOperationResult {
    shouldExecute: boolean;
    cachedResponse?: unknown;
}

export interface CompleteIdempotentOperationArgs {
    client: PoolClient;
    businessId: string;
    action: string;
    key?: string;
    response: unknown;
}
