import type { Response } from "express";

export function sendSuccess(
    res: Response,
    payload: {
        statusCode?: number;
        message?: string;
        data?: unknown;
    } = {}
) {
    const { statusCode = 200, message = "Success", data } = payload;
    return res.status(statusCode).json({
        success: true,
        message,
        data: data ?? null,
    });
}
