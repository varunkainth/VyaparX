import type { NextFunction, Request, Response } from "express";
import { logger } from "./logger";
import { AppError } from "./appError";
import { ERROR_CODES } from "../constants/errorCodes";
import { PlanFeatureError } from "../utils/checkFeature";
import { PlanLimitError } from "../utils/checkLimit";

export function errorHandler(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) {
    logger.error({
        err,
        requestId: req.id,
        url: req.url,
        method: req.method,
        stack: err.stack,
        body: req.body,
        user: req.user?.id || null
    }, "Unhandled Error");

    if (err?.code === "23505") {
        err = new AppError("Duplicate value violates unique constraint", 409, ERROR_CODES.DUPLICATE_RESOURCE);
    }

    if (err instanceof PlanFeatureError) {
        return res.status(403).json({
            error: "FEATURE_NOT_AVAILABLE",
            message: err.message,
            feature: err.feature,
            upgrade_required: true,
        });
    }

    if (err instanceof PlanLimitError) {
        return res.status(402).json({
            error: "PLAN_LIMIT_REACHED",
            message: err.message,
            limit_type: err.limit_type,
            current: err.current,
            max: err.max,
            upgrade_required: true,
        });
    }

    const statusCode = err instanceof AppError ? err.statusCode : err.statusCode || err.status || 500;
    const code = err instanceof AppError ? err.code : ERROR_CODES.INTERNAL_ERROR;
    const details = err instanceof AppError ? err.details : undefined;

    res.status(statusCode).json({
        success: false,
        error: {
            code,
            message: err.message || "Something went wrong",
            details: details ?? undefined,
        },
        requestId: req.id,
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
}
