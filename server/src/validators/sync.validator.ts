import { z } from "zod";

const uuid = z.string().uuid();

const mutationSchema = z.object({
    client_mutation_id: z.string().min(3).max(128),
    entity_type: z.enum(["party"]),
    operation: z.enum(["upsert", "delete"]),
    entity_id: uuid.optional(),
    base_updated_at: z.string().optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
    client_updated_at: z.string().optional(),
});

export const syncPushSchema = z.object({
    business_id: uuid,
    device_id: z.string().min(3).max(128),
    chunk_id: z.string().min(3).max(128).optional(),
    chunk_index: z.number().int().min(1).optional(),
    total_chunks: z.number().int().min(1).optional(),
    mutations: z.array(mutationSchema).min(1).max(500),
}).superRefine((value, ctx) => {
    if ((value.chunk_index && !value.total_chunks) || (!value.chunk_index && value.total_chunks)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "chunk_index and total_chunks must be provided together",
        });
    }
    if (value.chunk_index && value.total_chunks && value.chunk_index > value.total_chunks) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "chunk_index cannot be greater than total_chunks",
        });
    }
});

export const syncPullQuerySchema = z.object({
    business_id: uuid,
    since: z.coerce.number().int().min(0).optional().default(0),
    limit: z.coerce.number().int().min(1).max(500).optional().default(100),
});
