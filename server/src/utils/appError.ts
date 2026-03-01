import type { ErrorCode } from "../constants/errorCodes";

export class AppError extends Error {
    statusCode: number;
    code: ErrorCode;
    details?: unknown;

    constructor(message: string, statusCode = 500, code: ErrorCode = "INTERNAL_ERROR", details?: unknown) {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        Error.captureStackTrace?.(this, AppError);
    }
}
