import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import type { NextFunction, Request, Response } from "express";

import env from "../config/env";
import { ERROR_CODES } from "../constants/errorCodes";
import { authCookieNames } from "../utils/authCookies";

const normalizeOrigin = (value: string | undefined): string | null => {
    if (!value) return null;

    try {
        return new URL(value).origin;
    } catch {
        return null;
    }
};

const expandOriginVariants = (origin: string): string[] => {
    const variants = new Set<string>([origin]);

    try {
        const parsed = new URL(origin);
        const host = parsed.hostname.toLowerCase();

        if (host.startsWith("www.")) {
            parsed.hostname = host.replace(/^www\./, "");
            variants.add(parsed.origin);
        } else if (host.includes(".") && host !== "localhost") {
            parsed.hostname = `www.${host}`;
            variants.add(parsed.origin);
        }
    } catch {
        // Upstream env validation already checks format.
    }

    return [...variants];
};

const parseConfiguredOrigins = (): string[] => {
    const configured = new Set<string>();
    const raw = env.CORS_ALLOWED_ORIGINS.trim();

    if (raw) {
        for (const value of raw.split(",")) {
            const origin = normalizeOrigin(value.trim());
            if (!origin) continue;

            for (const variant of expandOriginVariants(origin)) {
                configured.add(variant);
            }
        }
    }

    const frontendOrigin = normalizeOrigin(env.FRONTEND_URL.trim());
    if (frontendOrigin) {
        for (const variant of expandOriginVariants(frontendOrigin)) {
            configured.add(variant);
        }
    }

    if (env.NODE_ENV !== "production") {
        configured.add("http://localhost:3000");
        configured.add("http://127.0.0.1:3000");
        configured.add("http://localhost:3001");
        configured.add("http://127.0.0.1:3001");
        configured.add("http://localhost:4000");
        configured.add("http://127.0.0.1:4000");
    }

    return [...configured];
};

const trustedOrigins = parseConfiguredOrigins();

const parseCookies = (cookieHeader: string | undefined): Record<string, string> => {
    if (!cookieHeader) return {};

    return cookieHeader.split(";").reduce<Record<string, string>>((cookies, segment) => {
        const [rawName, ...rawValue] = segment.trim().split("=");
        if (!rawName || rawValue.length === 0) {
            return cookies;
        }

        cookies[rawName] = decodeURIComponent(rawValue.join("="));
        return cookies;
    }, {});
};

const hasSessionCookies = (req: Request): boolean => {
    const cookies = parseCookies(req.headers.cookie);
    return Boolean(cookies[authCookieNames.access] || cookies[authCookieNames.refresh]);
};

const isExpoOrLocalOrigin = (origin: string): boolean => {
    return (
        origin.startsWith("exp://") ||
        origin.includes("192.168") ||
        origin.includes("localhost")
    );
};

export const getTrustedOrigins = (): string[] => trustedOrigins;

export const corsMiddleware = cors({
    origin(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
        if (!origin) {
            return callback(null, true);
        }

        if (isExpoOrLocalOrigin(origin)) {
            return callback(null, true);
        }

        const normalizedOrigin = normalizeOrigin(origin);
        if (!normalizedOrigin) {
            return callback(new Error("Origin not allowed by CORS"));
        }

        if (trustedOrigins.includes(normalizedOrigin)) {
            return callback(null, true);
        }

        return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
});

export const helmetMiddleware = helmet();

const csrfProtectedMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
    if (!csrfProtectedMethods.has(req.method.toUpperCase())) {
        return next();
    }

    if (!hasSessionCookies(req)) {
        return next();
    }

    const origin = normalizeOrigin(req.headers.origin);
    const referer = normalizeOrigin(req.headers.referer);
    const source = origin ?? referer;

    if (!source) {
        return res.status(403).json({
            success: false,
            error: {
                code: ERROR_CODES.FORBIDDEN,
                message: "Origin or Referer header required for state-changing requests",
            },
        });
    }

    if (!trustedOrigins.includes(source)) {
        return res.status(403).json({
            success: false,
            error: {
                code: ERROR_CODES.FORBIDDEN,
                message: "Cross-site request blocked",
            },
        });
    }

    return next();
};

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
