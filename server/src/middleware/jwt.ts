import type { NextFunction, Request, Response } from "express";
import { ERROR_CODES } from "../constants/errorCodes";
import { userRepository } from "../repository/user.repository";
import { authService } from "../services/auth.service";
import type { TokenPayload } from "../types/jwt";
import { authCookieNames } from "../utils/authCookies";
import { logger } from "../utils/logger";

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

const extractBearerToken = (req: Request): string | null => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }

    const token = authHeader.slice(7).trim();
    return token.length > 0 ? token : null;
};

const extractCookieToken = (req: Request, cookieName: string): string | null => {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies[cookieName];
    return token && token.length > 0 ? token : null;
};

const attachUserToRequest = (req: Request, decoded: TokenPayload) => {
    req.authToken = decoded;
    req.user = {
        id: decoded.userId,
        email: decoded.email,
        business_id: decoded.businessId,
        role: decoded.role,
    };
};

const validateTokenVersion = async (decoded: TokenPayload): Promise<boolean> => {
    if (decoded.tokenVersion === undefined) {
        return true;
    }

    const user = await userRepository.findById(decoded.userId);
    if (!user) {
        return false;
    }

    return user.token_version === decoded.tokenVersion;
};

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
        const token = extractBearerToken(req) ?? extractCookieToken(req, authCookieNames.access);

        if (!token) {
            return res.status(401).json({
                success: false,
                error: { code: ERROR_CODES.UNAUTHORIZED, message: "Valid Bearer token required" },
            });
        }

        const decoded = authService.verifyAccessToken(token);
        if (!decoded) {
            return res.status(401).json({
                success: false,
                error: { code: ERROR_CODES.UNAUTHORIZED, message: "Invalid or expired token" },
            });
        }

        const isTokenCurrent = await validateTokenVersion(decoded);
        if (!isTokenCurrent) {
            return res.status(401).json({
                success: false,
                error: { code: ERROR_CODES.SESSION_EXPIRED, message: "Please login again" },
            });
        }

        attachUserToRequest(req, decoded);

        logger.debug(
            { userId: decoded.userId, requestId: req.id, path: req.path },
            "User authenticated"
        );

        next();
    })().catch((error: any) => {
        logger.error({ error: error.message, requestId: req.id }, "Auth middleware failure");
        return res.status(500).json({
            success: false,
            error: { code: ERROR_CODES.INTERNAL_ERROR, message: "Authentication failed" },
        });
    });
};

export const authenticateRefreshToken = (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
        const token = extractBearerToken(req) ?? extractCookieToken(req, authCookieNames.refresh);

        if (!token) {
            return res.status(401).json({
                success: false,
                error: { code: ERROR_CODES.UNAUTHORIZED, message: "Valid Bearer refresh token required" },
            });
        }

        const decoded = authService.verifyRefreshToken(token);
        if (!decoded) {
            return res.status(401).json({
                success: false,
                error: { code: ERROR_CODES.UNAUTHORIZED, message: "Invalid or expired refresh token" },
            });
        }

        const isTokenCurrent = await validateTokenVersion(decoded);
        if (!isTokenCurrent) {
            return res.status(401).json({
                success: false,
                error: { code: ERROR_CODES.SESSION_EXPIRED, message: "Please login again" },
            });
        }

        attachUserToRequest(req, decoded);

        logger.debug(
            { userId: decoded.userId, requestId: req.id, path: req.path },
            "Refresh token authenticated"
        );

        next();
    })().catch((error: any) => {
        logger.error({ error: error.message, requestId: req.id }, "Refresh auth middleware failure");
        return res.status(500).json({
            success: false,
            error: { code: ERROR_CODES.INTERNAL_ERROR, message: "Authentication failed" },
        });
    });
};

export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
    const token = extractBearerToken(req) ?? extractCookieToken(req, authCookieNames.access);

    if (!token) {
        return next();
    }

    const decoded = authService.verifyAccessToken(token);
    if (decoded) {
        attachUserToRequest(req, decoded);
    }

    next();
};
