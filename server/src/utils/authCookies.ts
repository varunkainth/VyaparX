import type { Response } from "express";
import env from "../config/env";

const ACCESS_COOKIE_NAME = "vyaparx_access_token";
const REFRESH_COOKIE_NAME = "vyaparx_refresh_token";
type SupportedSameSite = "lax" | "strict" | "none";

const normalizeSameSite = (value: string): SupportedSameSite => {
    const normalized = value.trim().toLowerCase();
    if (normalized === "strict" || normalized === "none") {
        return normalized;
    }
    return "lax";
};

const getBaseCookieOptions = () => {
    const sameSite = normalizeSameSite(env.COOKIE_SAME_SITE);

    return {
        httpOnly: true,
        sameSite,
        secure: env.COOKIE_SECURE || sameSite === "none",
        path: "/",
        ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
    };
};

export const authCookieNames = {
    access: ACCESS_COOKIE_NAME,
    refresh: REFRESH_COOKIE_NAME,
} as const;

export const setAuthCookies = (
    res: Response,
    tokens: { accessToken: string; refreshToken: string }
) => {
    res.cookie(ACCESS_COOKIE_NAME, tokens.accessToken, {
        ...getBaseCookieOptions(),
        maxAge: 15 * 60 * 1000,
    });
    res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, {
        ...getBaseCookieOptions(),
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
};

export const clearAuthCookies = (res: Response) => {
    res.clearCookie(ACCESS_COOKIE_NAME, getBaseCookieOptions());
    res.clearCookie(REFRESH_COOKIE_NAME, getBaseCookieOptions());
};
