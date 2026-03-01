import type { NextFunction, Request, Response } from "express";
import { logger } from "./logger";
import { AppError } from "./appError";
import { ERROR_CODES } from "../constants/errorCodes";

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
