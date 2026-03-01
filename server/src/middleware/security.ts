import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import env from "../config/env";

const parseAllowedOrigins = (): string[] => {
    const raw = env.CORS_ALLOWED_ORIGINS.trim();
    if (!raw) return [];
    return raw.split(",").map((value) => value.trim()).filter(Boolean);
};

const allowedOrigins = parseAllowedOrigins();

export const corsMiddleware = cors({
    origin(
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void
    ) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
});

export const helmetMiddleware = helmet();

const createLimiter = (windowMs: number, max: number) =>
    rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            success: false,
            error: {
                code: "RATE_LIMITED",
                message: "Too many requests, please retry later",
            },
        },
    });

export const globalRateLimit = createLimiter(env.RATE_LIMIT_WINDOW_MS, env.RATE_LIMIT_MAX_REQUESTS);
export const authRateLimit = createLimiter(
    env.AUTH_RATE_LIMIT_WINDOW_MS,
    env.AUTH_RATE_LIMIT_MAX_REQUESTS
);
