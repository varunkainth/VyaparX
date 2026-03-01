import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AppError } from "../utils/appError";
import { ERROR_CODES } from "../constants/errorCodes";

export const validate = (schema: z.ZodTypeAny) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const result = await schema.safeParseAsync(req.body);
        
        if (!result.success) {
            return next(
                new AppError("Validation failed", 400, ERROR_CODES.VALIDATION_ERROR, result.error.issues)
            );
        }
        
        req.body = result.data;
        next();
    };
};
