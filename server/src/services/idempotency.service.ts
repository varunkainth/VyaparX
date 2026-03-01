import { ERROR_CODES } from "../constants/errorCodes";
import { idempotencyRepository } from "../repository/idempotency.repository";
import type {
    CompleteIdempotentOperationArgs,
    StartIdempotentOperationArgs,
    StartIdempotentOperationResult,
} from "../types/idempotency";
import { AppError } from "../utils/appError";

export async function startIdempotentOperation(
    args: StartIdempotentOperationArgs
): Promise<StartIdempotentOperationResult> {
    const { client, businessId, action, key, createdBy } = args;

    if (!key) {
        return { shouldExecute: true };
    }

    const inserted = await idempotencyRepository.insertInProgress(
        client,
        businessId,
        action,
        key,
        createdBy
    );

    if (inserted.rowCount === 1) {
        return { shouldExecute: true };
    }

    const existing = await idempotencyRepository.getByKeyForUpdate(client, businessId, action, key);

    if (existing.rowCount === 0) {
        return { shouldExecute: true };
    }

    const row = existing.rows[0];
    if (row && row.status === "completed" && row.response_json) {
        return { shouldExecute: false, cachedResponse: row.response_json };
    }

    throw new AppError(
        "Duplicate request is currently being processed",
        409,
        ERROR_CODES.DUPLICATE_REQUEST_IN_PROGRESS
    );
}

export async function completeIdempotentOperation(args: CompleteIdempotentOperationArgs): Promise<void> {
    const { client, businessId, action, key, response } = args;

    if (!key) {
        return;
    }

    await idempotencyRepository.markCompleted(
        client,
        businessId,
        action,
        key,
        JSON.stringify(response)
    );
}
