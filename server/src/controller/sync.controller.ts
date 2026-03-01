import type { Request, Response } from "express";
import { ERROR_CODES } from "../constants/errorCodes";
import { pullSyncChanges, pushSyncMutations } from "../services/sync.service";
import type { SyncPullQueryRaw, SyncPushBody } from "../types/sync";
import { AppError } from "../utils/appError";
import { sendSuccess } from "../utils/responseHandler";
import { syncPullQuerySchema } from "../validators/sync.validator";

export const pushSyncHandler = async (req: Request<{}, unknown, SyncPushBody>, res: Response) => {
    const businessId = req.body.business_id;
    if (!businessId) {
        throw new AppError("business_id is required", 400, ERROR_CODES.BAD_REQUEST);
    }

    const result = await pushSyncMutations(req.body);
    return sendSuccess(res, {
        message: "Sync push processed",
        data: result,
    });
};

export const pullSyncHandler = async (
    req: Request<{}, unknown, unknown, SyncPullQueryRaw>,
    res: Response
) => {
    const parsed = syncPullQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        throw new AppError("Validation failed", 400, ERROR_CODES.VALIDATION_ERROR, parsed.error.issues);
    }

    const result = await pullSyncChanges(parsed.data);
    return sendSuccess(res, {
        message: "Sync pull fetched",
        data: result,
    });
};

