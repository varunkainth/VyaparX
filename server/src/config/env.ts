import dotenv from "dotenv"

dotenv.config()

const isNonEmptyString = (value: string | undefined): value is string =>
    typeof value === "string" && value.trim().length > 0

const parseInteger = (name: string, value: string | undefined, fallback: number): number => {
    if (!isNonEmptyString(value)) {
        return fallback
    }

    const parsed = Number.parseInt(value, 10)
    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`Environment variable ${name} must be a positive integer`)
    }

    return parsed
}

const parseBoolean = (name: string, value: string | undefined, fallback: boolean): boolean => {
    if (value === undefined) {
        return fallback
    }

    const normalized = value.trim().toLowerCase()
    if (normalized === "true") return true
    if (normalized === "false") return false

    throw new Error(`Environment variable ${name} must be either "true" or "false"`)
}

const parseUrl = (
    name: string,
    value: string | undefined,
    options: { required?: boolean; requireHttpsInProduction?: boolean } = {}
): string => {
    const trimmed = value?.trim() ?? ""
    if (!trimmed) {
        if (options.required) {
            throw new Error(`Missing required environment variable: ${name}`)
        }
        return ""
    }

    let parsed: URL
    try {
        parsed = new URL(trimmed)
    } catch {
        throw new Error(`Environment variable ${name} must be a valid absolute URL`)
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error(`Environment variable ${name} must use http or https`)
    }

    if (
        options.requireHttpsInProduction &&
        process.env.NODE_ENV === "production" &&
        parsed.protocol !== "https:"
    ) {
        throw new Error(`Environment variable ${name} must use https in production`)
    }

    return parsed.toString().replace(/\/$/, "")
}

const parseOriginList = (name: string, value: string | undefined): string[] => {
    const trimmed = value?.trim() ?? ""
    if (!trimmed) return []

    return trimmed.split(",").map((entry) => {
        const rawOrigin = entry.trim()
        if (!rawOrigin) {
            throw new Error(`Environment variable ${name} contains an empty origin`)
        }

        let parsed: URL
        try {
            parsed = new URL(rawOrigin)
        } catch {
            throw new Error(`Environment variable ${name} contains an invalid origin: ${rawOrigin}`)
        }

        if (!["http:", "https:"].includes(parsed.protocol)) {
            throw new Error(`Environment variable ${name} contains a non-http origin: ${rawOrigin}`)
        }

        return parsed.origin
    })
}

const parseSameSite = (value: string | undefined): "lax" | "strict" | "none" => {
    const normalized = value?.trim().toLowerCase() || "lax"
    if (normalized === "lax" || normalized === "strict" || normalized === "none") {
        return normalized
    }

    throw new Error(`Environment variable COOKIE_SAME_SITE must be one of: lax, strict, none`)
}

const parseCookieDomain = (value: string | undefined): string => {
    const trimmed = value?.trim() ?? ""
    if (!trimmed) return ""
    if (trimmed.includes("://") || trimmed.includes("/") || trimmed.includes(" ")) {
        throw new Error("Environment variable COOKIE_DOMAIN must be a bare domain, not a URL")
    }
    return trimmed
}

const parseHost = (name: string, value: string): string => {
    const trimmed = value.trim().toLowerCase()
    if (!trimmed) {
        throw new Error(`Environment variable ${name} must not be empty`)
    }

    if (trimmed.includes("://") || trimmed.includes("/") || trimmed.includes(" ")) {
        throw new Error(`Environment variable ${name} must be a host name, not a URL`)
    }

    return trimmed
}

const validateSecretStrength = (name: string, value: string) => {
    if (process.env.NODE_ENV !== "production") {
        return
    }

    if (value.length < 32) {
        throw new Error(`Environment variable ${name} must be at least 32 characters in production`)
    }
}

const requiredEnvVars = [
    "DATABASE_URL",
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
] as const

const optionalEnvVars = [
    "PORT",
    "NODE_ENV",
    "APP_ENV",
    "FRONTEND_URL",
    "DATABASE_URL_TEST",
    "DATABASE_URL_STAGING",
    "DATABASE_URL_PRODUCTION",
    "DATABASE_SSL_ENABLED",
    "DATABASE_SSL_REJECT_UNAUTHORIZED",
    "CORS_ALLOWED_ORIGINS",
    "RATE_LIMIT_WINDOW_MS",
    "RATE_LIMIT_MAX_REQUESTS",
    "AUTH_RATE_LIMIT_WINDOW_MS",
    "AUTH_RATE_LIMIT_MAX_REQUESTS",
    "COOKIE_SECURE",
    "COOKIE_SAME_SITE",
    "COOKIE_DOMAIN",
    "WEBAUTHN_RP_ID",
    "WEBAUTHN_RP_NAME",
    "WEBAUTHN_ORIGIN",
    // Add more optional env vars here
] as const

// Validate required env vars
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`)
    }
}

validateSecretStrength("JWT_ACCESS_SECRET", process.env.JWT_ACCESS_SECRET as string)
validateSecretStrength("JWT_REFRESH_SECRET", process.env.JWT_REFRESH_SECRET as string)

const nodeEnv = process.env.NODE_ENV || "development"
const isProduction = nodeEnv === "production"
const frontendUrl = parseUrl("FRONTEND_URL", process.env.FRONTEND_URL, {
    required: isProduction,
    requireHttpsInProduction: true,
})
const corsAllowedOrigins = parseOriginList("CORS_ALLOWED_ORIGINS", process.env.CORS_ALLOWED_ORIGINS)

if (isProduction && corsAllowedOrigins.length === 0) {
    throw new Error("Missing required environment variable: CORS_ALLOWED_ORIGINS")
}

if (frontendUrl) {
    const frontendOrigin = new URL(frontendUrl).origin
    if (corsAllowedOrigins.length > 0 && !corsAllowedOrigins.includes(frontendOrigin)) {
        throw new Error("CORS_ALLOWED_ORIGINS must include the FRONTEND_URL origin")
    }
}

const cookieSameSite = parseSameSite(process.env.COOKIE_SAME_SITE)
const cookieSecure = parseBoolean("COOKIE_SECURE", process.env.COOKIE_SECURE, isProduction)
if (cookieSameSite === "none" && !cookieSecure) {
    throw new Error("COOKIE_SECURE must be true when COOKIE_SAME_SITE=none")
}

const cookieDomain = parseCookieDomain(process.env.COOKIE_DOMAIN)
const webauthnOrigin = parseUrl(
    "WEBAUTHN_ORIGIN",
    process.env.WEBAUTHN_ORIGIN || frontendUrl || "http://localhost:3000",
    {
        required: true,
        requireHttpsInProduction: true,
    }
)
const webauthnRpId = parseHost(
    "WEBAUTHN_RP_ID",
    process.env.WEBAUTHN_RP_ID || new URL(webauthnOrigin).hostname
)
const webauthnRpName = process.env.WEBAUTHN_RP_NAME?.trim() || "VyaparX"

// Export all env vars in one place
const env = {
    // Database
    DATABASE_URL: process.env.DATABASE_URL as string,
    DATABASE_URL_TEST: process.env.DATABASE_URL_TEST || "",
    DATABASE_URL_STAGING: process.env.DATABASE_URL_STAGING || "",
    DATABASE_URL_PRODUCTION: process.env.DATABASE_URL_PRODUCTION || "",
    DATABASE_SSL_ENABLED:
        process.env.DATABASE_SSL_ENABLED === "true" || process.env.NODE_ENV === "production",
    
    // Server
    PORT: parseInteger("PORT", process.env.PORT, 3000),
    NODE_ENV: nodeEnv,
    APP_ENV: process.env.APP_ENV || "",
    DATABASE_SSL_REJECT_UNAUTHORIZED:
        parseBoolean(
            "DATABASE_SSL_REJECT_UNAUTHORIZED",
            process.env.DATABASE_SSL_REJECT_UNAUTHORIZED,
            false
        ),

    // Security
    FRONTEND_URL: frontendUrl,
    CORS_ALLOWED_ORIGINS: corsAllowedOrigins.join(","),
    RATE_LIMIT_WINDOW_MS: parseInteger(
        "RATE_LIMIT_WINDOW_MS",
        process.env.RATE_LIMIT_WINDOW_MS,
        15 * 60 * 1000
    ),
    RATE_LIMIT_MAX_REQUESTS: parseInteger(
        "RATE_LIMIT_MAX_REQUESTS",
        process.env.RATE_LIMIT_MAX_REQUESTS,
        300
    ),
    AUTH_RATE_LIMIT_WINDOW_MS: parseInteger(
        "AUTH_RATE_LIMIT_WINDOW_MS",
        process.env.AUTH_RATE_LIMIT_WINDOW_MS,
        15 * 60 * 1000
    ),
    AUTH_RATE_LIMIT_MAX_REQUESTS: parseInteger(
        "AUTH_RATE_LIMIT_MAX_REQUESTS",
        process.env.AUTH_RATE_LIMIT_MAX_REQUESTS,
        50
    ),
    COOKIE_SECURE: cookieSecure,
    COOKIE_SAME_SITE: cookieSameSite,
    COOKIE_DOMAIN: cookieDomain,
    WEBAUTHN_RP_ID: webauthnRpId,
    WEBAUTHN_RP_NAME: webauthnRpName,
    WEBAUTHN_ORIGIN: webauthnOrigin,

    // JWT
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET as string,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET as string,
    JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || "15m",
    JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || "7d",

    // Add more variables below as needed
    // REDIS_URL: process.env.REDIS_URL || "",
    // API_KEY: process.env.API_KEY as string,
} as const

const resolveDatabaseUrl = (): string => {
    const appEnv = env.APP_ENV.toLowerCase();

    if (appEnv === "test" && env.DATABASE_URL_TEST) return env.DATABASE_URL_TEST;
    if (appEnv === "staging" && env.DATABASE_URL_STAGING) return env.DATABASE_URL_STAGING;
    if (appEnv === "production" && env.DATABASE_URL_PRODUCTION) return env.DATABASE_URL_PRODUCTION;

    if (env.NODE_ENV === "test" && env.DATABASE_URL_TEST) return env.DATABASE_URL_TEST;
    if (env.NODE_ENV === "production" && env.DATABASE_URL_PRODUCTION) return env.DATABASE_URL_PRODUCTION;

    return env.DATABASE_URL;
};

export const RESOLVED_DATABASE_URL = resolveDatabaseUrl();

export default env
