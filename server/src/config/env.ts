import dotenv from "dotenv"

dotenv.config()

const requiredEnvVars = [
    "DATABASE_URL",
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
] as const

const optionalEnvVars = [
    "PORT",
    "NODE_ENV",
    "APP_ENV",
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
    // Add more optional env vars here
] as const

// Validate required env vars
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`)
    }
}

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
    PORT: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    NODE_ENV: process.env.NODE_ENV || "development",
    APP_ENV: process.env.APP_ENV || "",
    DATABASE_SSL_REJECT_UNAUTHORIZED:
        process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true",

    // Security
    CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS || "",
    RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS ? parseInt(process.env.RATE_LIMIT_WINDOW_MS) : 15 * 60 * 1000,
    RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS ? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) : 300,
    AUTH_RATE_LIMIT_WINDOW_MS: process.env.AUTH_RATE_LIMIT_WINDOW_MS
        ? parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS)
        : 15 * 60 * 1000,
    AUTH_RATE_LIMIT_MAX_REQUESTS: process.env.AUTH_RATE_LIMIT_MAX_REQUESTS
        ? parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS)
        : 50,

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
