import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";
import IORedis from "ioredis";
import env from "../config/env";

type CacheClient = {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
    incr(key: string): Promise<void>;
    ping(): Promise<string>;
};

const standardRedis =
    env.CACHE_ENABLED && env.REDIS_URL
        ? new IORedis(env.REDIS_URL, {
              lazyConnect: true,
              maxRetriesPerRequest: 1,
          })
        : null;

const upstashRedis =
    !standardRedis &&
    env.CACHE_ENABLED &&
    env.UPSTASH_REDIS_REST_URL &&
    env.UPSTASH_REDIS_REST_TOKEN
        ? new Redis({
              url: env.UPSTASH_REDIS_REST_URL,
              token: env.UPSTASH_REDIS_REST_TOKEN,
          })
        : null;

const redis: CacheClient | null = standardRedis
    ? {
          async get<T>(key: string) {
              const value = await standardRedis.get(key);
              if (value === null) return null;
              return JSON.parse(value) as T;
          },
          async set<T>(key: string, value: T, ttlSeconds: number) {
              await standardRedis.set(key, JSON.stringify(value), "EX", ttlSeconds);
          },
          async incr(key: string) {
              await standardRedis.incr(key);
          },
          async ping() {
              return standardRedis.ping();
          },
      }
    : upstashRedis
      ? {
            async get<T>(key: string) {
                const value = await upstashRedis.get<T>(key);
                return value ?? null;
            },
            async set<T>(key: string, value: T, ttlSeconds: number) {
                await upstashRedis.setex(key, ttlSeconds, value);
            },
            async incr(key: string) {
                await upstashRedis.incr(key);
            },
            async ping() {
                return upstashRedis.ping();
            },
        }
      : null;

const logCacheError = (action: string, error: unknown) => {
    console.warn(`[cache] ${action} failed`, error);
};

export const cacheTtlSeconds = {
    dashboard: env.CACHE_TTL_DASHBOARD_SECONDS,
    invoiceList: env.CACHE_TTL_INVOICE_LIST_SECONDS,
    invoiceDetail: env.CACHE_TTL_INVOICE_DETAIL_SECONDS,
    publicInvoice: env.CACHE_TTL_PUBLIC_INVOICE_SECONDS,
} as const;

export const getCacheHealth = async () => {
    const configured = Boolean(
        env.REDIS_URL || (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN)
    );
    const provider = env.REDIS_URL
        ? "redis-url"
        : env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
          ? "upstash"
          : "none";

    if (!env.CACHE_ENABLED) {
        return {
            enabled: false,
            configured,
            provider,
            status: "disabled" as const,
        };
    }

    if (!redis) {
        return {
            enabled: true,
            configured,
            provider,
            status: "unconfigured" as const,
        };
    }

    try {
        const response = await redis.ping();
        return {
            enabled: true,
            configured: true,
            provider,
            status: response.toUpperCase() === "PONG" ? ("ok" as const) : ("degraded" as const),
            response,
        };
    } catch (error) {
        return {
            enabled: true,
            configured: true,
            provider,
            status: "error" as const,
            error: error instanceof Error ? error.message : "Unknown cache error",
        };
    }
};

const namespaceVersionKey = (namespace: string) => `cache:ns:${namespace}`;

const getNamespaceVersion = async (namespace: string): Promise<number> => {
    if (!redis) return 0;

    try {
        const value = await redis.get<number | string>(namespaceVersionKey(namespace));
        const parsed = Number(value ?? 0);
        return Number.isFinite(parsed) ? parsed : 0;
    } catch (error) {
        logCacheError(`get namespace version (${namespace})`, error);
        return 0;
    }
};

const bumpNamespaceVersion = async (namespace: string) => {
    if (!redis) return;

    try {
        await redis.incr(namespaceVersionKey(namespace));
    } catch (error) {
        logCacheError(`bump namespace version (${namespace})`, error);
    }
};

const sha1 = (value: unknown) =>
    createHash("sha1").update(JSON.stringify(value)).digest("hex");

export const buildDashboardCacheKey = async (businessId: string) => {
    const version = await getNamespaceVersion(`dashboard:${businessId}`);
    return `dashboard:${businessId}:v${version}`;
};

export const buildInvoiceListCacheKey = async (
    businessId: string,
    input: {
        include_cancelled?: boolean;
        party_id?: string;
        payment_status?: string;
        invoice_type?: string;
        from_date?: string;
        to_date?: string;
        search?: string;
        limit?: number;
        page?: number;
    }
) => {
    const version = await getNamespaceVersion(`invoice:list:${businessId}`);
    const fingerprint = sha1({
        include_cancelled: Boolean(input.include_cancelled),
        party_id: input.party_id ?? "",
        payment_status: input.payment_status ?? "",
        invoice_type: input.invoice_type ?? "",
        from_date: input.from_date ?? "",
        to_date: input.to_date ?? "",
        search: input.search ?? "",
        limit: input.limit ?? 20,
        page: input.page ?? 1,
    });

    return `invoice:list:${businessId}:v${version}:${fingerprint}`;
};

export const buildInvoiceDetailCacheKey = async (businessId: string, invoiceId: string) => {
    const version = await getNamespaceVersion(`invoice:${businessId}:${invoiceId}`);
    return `invoice:detail:${businessId}:${invoiceId}:v${version}`;
};

export const buildPublicInvoiceCacheKey = async (businessId: string, invoiceId: string) => {
    const version = await getNamespaceVersion(`invoice:${businessId}:${invoiceId}`);
    return `invoice:public:${businessId}:${invoiceId}:v${version}`;
};

export const getOrSetCache = async <T>(
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>
): Promise<T> => {
    if (!redis) {
        return loader();
    }

    try {
        const cached = await redis.get<T>(key);
        if (cached !== null && cached !== undefined) {
            return cached;
        }
    } catch (error) {
        logCacheError(`get (${key})`, error);
    }

    const fresh = await loader();

    try {
        await redis.set(key, fresh, ttlSeconds);
    } catch (error) {
        logCacheError(`set (${key})`, error);
    }

    return fresh;
};

export const invalidateDashboardCache = async (businessId: string) => {
    await bumpNamespaceVersion(`dashboard:${businessId}`);
};

export const invalidateInvoiceListCache = async (businessId: string) => {
    await bumpNamespaceVersion(`invoice:list:${businessId}`);
};

export const invalidateInvoiceCache = async (businessId: string, invoiceId: string) => {
    await bumpNamespaceVersion(`invoice:${businessId}:${invoiceId}`);
};

export const invalidateBusinessFinancialCache = async (
    businessId: string,
    invoiceIds: string[] = []
) => {
    const uniqueInvoiceIds = [...new Set(invoiceIds.filter(Boolean))];

    await Promise.all([
        invalidateDashboardCache(businessId),
        invalidateInvoiceListCache(businessId),
        ...uniqueInvoiceIds.map((invoiceId) => invalidateInvoiceCache(businessId, invoiceId)),
    ]);
};
