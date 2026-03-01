import { ERROR_CODES } from "../constants/errorCodes";
import { deactivateParty, getPartyById, updateParty, createParty } from "./party.service";
import { syncRepository } from "../repository/sync.repository";
import type { SyncPushBody } from "../types/sync";
import { AppError } from "../utils/appError";
import { createHash } from "node:crypto";

type SyncMutationResult = {
    client_mutation_id: string;
    status: "applied" | "duplicate" | "conflict" | "error";
    entity_type: string;
    operation: string;
    entity_id?: string;
    error_code?: string;
    error_message?: string;
    deduped?: boolean;
};

const asRecord = (value: unknown): Record<string, unknown> =>
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const stableStringify = (value: unknown): string => {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
};

const mutationHash = (mutation: SyncPushBody["mutations"][number]): string => {
    const content = stableStringify({
        entity_type: mutation.entity_type,
        operation: mutation.operation,
        entity_id: mutation.entity_id ?? null,
        base_updated_at: mutation.base_updated_at ?? null,
        payload: mutation.payload ?? null,
        client_updated_at: mutation.client_updated_at ?? null,
    });
    return createHash("sha256").update(content).digest("hex");
};

const assertOptimisticBase = (mutationBaseUpdatedAt: string | undefined, currentUpdatedAt: unknown) => {
    if (!mutationBaseUpdatedAt) return;

    const baseMillis = Date.parse(mutationBaseUpdatedAt);
    const currentMillis = Date.parse(String(currentUpdatedAt ?? ""));
    if (Number.isNaN(baseMillis) || Number.isNaN(currentMillis)) {
        throw new AppError("Invalid base_updated_at", 400, ERROR_CODES.BAD_REQUEST);
    }

    if (baseMillis !== currentMillis) {
        throw new AppError("Mutation conflict due to stale base_updated_at", 409, ERROR_CODES.OPTIMISTIC_CONFLICT, {
            server_updated_at: String(currentUpdatedAt),
            base_updated_at: mutationBaseUpdatedAt,
        });
    }
};

const applyPartyMutation = async (businessId: string, mutation: SyncPushBody["mutations"][number]) => {
    if (mutation.operation === "delete") {
        if (!mutation.entity_id) {
            throw new AppError("entity_id required for delete", 400, ERROR_CODES.BAD_REQUEST);
        }
        const existing = await getPartyById(businessId, mutation.entity_id);
        if (!existing) {
            throw new AppError("Party not found", 404, ERROR_CODES.PARTY_NOT_FOUND);
        }
        assertOptimisticBase(mutation.base_updated_at, existing.updated_at);

        const deleted = await deactivateParty(businessId, mutation.entity_id);
        if (!deleted) {
            throw new AppError("Party not found", 404, ERROR_CODES.PARTY_NOT_FOUND);
        }
        return { entity_id: String(deleted.id), payload: deleted as Record<string, unknown> };
    }

    if (mutation.entity_id) {
        const existing = await getPartyById(businessId, mutation.entity_id);
        if (existing) {
            assertOptimisticBase(mutation.base_updated_at, existing.updated_at);
            const updated = await updateParty(businessId, mutation.entity_id, asRecord(mutation.payload));
            if (!updated) {
                throw new AppError("Party not found", 404, ERROR_CODES.PARTY_NOT_FOUND);
            }
            return { entity_id: String(updated.id), payload: updated as Record<string, unknown> };
        }
    }

    const payload = asRecord(mutation.payload);
    const created = await createParty({
        business_id: businessId,
        name: String(payload.name ?? ""),
        party_type: (payload.party_type as "customer" | "supplier" | "both") ?? "customer",
        gstin: payload.gstin as string | undefined,
        pan: payload.pan as string | undefined,
        state_code: payload.state_code as string | undefined,
        state: payload.state as string | undefined,
        address: payload.address as string | undefined,
        city: payload.city as string | undefined,
        pincode: payload.pincode as string | undefined,
        phone: payload.phone as string | undefined,
        email: payload.email as string | undefined,
        opening_balance: typeof payload.opening_balance === "number" ? payload.opening_balance : undefined,
        opening_balance_type: payload.opening_balance_type as "receivable" | "payable" | "none" | undefined,
        notes: payload.notes as string | undefined,
    });
    return { entity_id: String(created.id), payload: created as Record<string, unknown> };
};

export async function pushSyncMutations(input: SyncPushBody) {
    const results: SyncMutationResult[] = [];

    for (const mutation of input.mutations) {
        const reqHash = mutationHash(mutation);
        const existing = await syncRepository.getMutation(
            input.business_id,
            input.device_id,
            mutation.client_mutation_id
        );

        if (existing) {
            if (existing.request_hash && existing.request_hash !== reqHash) {
                results.push({
                    client_mutation_id: mutation.client_mutation_id,
                    status: "conflict",
                    entity_type: mutation.entity_type,
                    operation: mutation.operation,
                    entity_id: existing.entity_id ?? undefined,
                    error_code: ERROR_CODES.DUPLICATE_RESOURCE,
                    error_message: "client_mutation_id reused with different payload",
                    deduped: true,
                });
                continue;
            }

            if (existing.response_json && typeof existing.response_json === "object") {
                const cached = existing.response_json as SyncMutationResult;
                results.push({
                    ...cached,
                    deduped: true,
                });
                continue;
            }

            results.push({
                client_mutation_id: mutation.client_mutation_id,
                status: "duplicate",
                entity_type: mutation.entity_type,
                operation: mutation.operation,
                entity_id: existing.entity_id ?? undefined,
                deduped: true,
            });
            continue;
        }

        try {
            let entityId = mutation.entity_id;
            let payload: Record<string, unknown> | undefined;

            if (mutation.entity_type === "party") {
                const applied = await applyPartyMutation(input.business_id, mutation);
                entityId = applied.entity_id;
                payload = applied.payload;
            }

            await syncRepository.insertMutation({
                businessId: input.business_id,
                deviceId: input.device_id,
                clientMutationId: mutation.client_mutation_id,
                entityType: mutation.entity_type,
                operation: mutation.operation,
                entityId,
                requestJson: mutation.payload,
                requestHash: reqHash,
                responseJson: {
                    client_mutation_id: mutation.client_mutation_id,
                    status: "applied",
                    entity_type: mutation.entity_type,
                    operation: mutation.operation,
                    entity_id: entityId,
                },
                status: "applied",
            });

            if (entityId) {
                await syncRepository.insertChange({
                    businessId: input.business_id,
                    entityType: mutation.entity_type,
                    entityId,
                    operation: mutation.operation,
                    payload,
                });
            }

            results.push({
                client_mutation_id: mutation.client_mutation_id,
                status: "applied",
                entity_type: mutation.entity_type,
                operation: mutation.operation,
                entity_id: entityId,
            });
        } catch (error: unknown) {
            const appError = error instanceof AppError ? error : null;
            const errorCode = appError?.code ?? ERROR_CODES.INTERNAL_ERROR;
            const errorMessage = appError?.message ?? "Mutation apply failed";
            const mutationStatus: SyncMutationResult["status"] =
                errorCode === ERROR_CODES.OPTIMISTIC_CONFLICT ? "conflict" : "error";
            const mutationResult: SyncMutationResult = {
                client_mutation_id: mutation.client_mutation_id,
                status: mutationStatus,
                entity_type: mutation.entity_type,
                operation: mutation.operation,
                entity_id: mutation.entity_id,
                error_code: errorCode,
                error_message: errorMessage,
            };

            await syncRepository.insertMutation({
                businessId: input.business_id,
                deviceId: input.device_id,
                clientMutationId: mutation.client_mutation_id,
                entityType: mutation.entity_type,
                operation: mutation.operation,
                entityId: mutation.entity_id,
                requestJson: mutation.payload,
                requestHash: reqHash,
                responseJson: mutationResult,
                status: mutationStatus,
                errorCode,
                errorMessage,
            });

            results.push(mutationResult);
        }
    }

    const summary = results.reduce(
        (acc, row) => {
            if (row.status === "applied") acc.applied += 1;
            else if (row.status === "duplicate") acc.duplicate += 1;
            else if (row.status === "conflict") acc.conflict += 1;
            else if (row.status === "error") acc.error += 1;
            return acc;
        },
        { total: results.length, applied: 0, duplicate: 0, conflict: 0, error: 0 }
    );

    return {
        business_id: input.business_id,
        device_id: input.device_id,
        chunk: {
            chunk_id: input.chunk_id ?? null,
            chunk_index: input.chunk_index ?? null,
            total_chunks: input.total_chunks ?? null,
        },
        summary,
        results,
    };
}

export async function pullSyncChanges(args: { business_id: string; since: number; limit: number }) {
    const changes = await syncRepository.listChanges({
        businessId: args.business_id,
        since: args.since,
        limit: args.limit,
    });

    const nextCursor = changes.length > 0 ? Number(changes[changes.length - 1]?.id ?? args.since) : args.since;
    return {
        business_id: args.business_id,
        since: args.since,
        next_cursor: nextCursor,
        changes,
    };
}
