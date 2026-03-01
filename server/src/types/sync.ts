export type SyncEntityType = "party";
export type SyncOperation = "upsert" | "delete";

export interface SyncMutationInput {
    client_mutation_id: string;
    entity_type: SyncEntityType;
    operation: SyncOperation;
    entity_id?: string;
    base_updated_at?: string;
    payload?: Record<string, unknown>;
    client_updated_at?: string;
}

export interface SyncPushBody {
    business_id: string;
    device_id: string;
    chunk_id?: string;
    chunk_index?: number;
    total_chunks?: number;
    mutations: SyncMutationInput[];
}

export interface SyncPullQueryRaw {
    [key: string]: string | undefined;
    business_id?: string;
    since?: string;
    limit?: string;
}
