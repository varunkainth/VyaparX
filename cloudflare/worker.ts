interface Env {
  EMAIL_ORIGIN?: string;
  HEALTH_PATH?: string;
  WARM_PATHS?: string;
  WORKER_ORIGINS?: string;
  WORKER_WARM_PATHS?: string;
  ORIGIN_1: string;
  ORIGIN_2?: string;
  ORIGIN_3?: string;
  ORIGIN_4?: string;
  READ_ORIGINS?: string;
  WRITE_ORIGIN?: string;
}

interface WorkerScheduledController {
  cron: string;
  scheduledTime: number;
  noRetry(): void;
}

const RETRYABLE_STATUS_CODES = new Set([502, 503, 504, 522, 523, 524]);

const EMAIL_ROUTE_PATTERNS = [
  /^\/auth\/signup$/,
  /^\/api\/v1\/auth\/forgot-password$/,
  /^\/api\/v1\/auth\/send-verification-email$/,
  /^\/api\/v1\/auth\/resend-verification-email$/,
  /^\/api\/v1\/businesses\/[^/]+\/invoices\/[^/]+\/email$/,
  /^\/api\/v1\/businesses\/[^/]+\/members\/invite$/,
  /^\/api\/v1\/email\/test$/,
  /^\/api\/v1\/email\/status$/,
];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },

  async scheduled(_controller: WorkerScheduledController, env: Env): Promise<void> {
    await keepOriginsWarm(env);
  },
};

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const requestBody = await readRequestBody(request);
  const origins = getConfiguredOrigins(env);
  const emailOrigin = normalizeOrigin(env.EMAIL_ORIGIN || origins[0]);

  if (isEmailRoute(url.pathname)) {
    return proxyRequest(request, requestBody, emailOrigin, "email");
  }

  const requestKind = isWriteMethod(request.method) ? "write" : "read";
  const targetOrigins =
    requestKind === "write"
      ? getWriteOrigins(env, origins)
      : getReadOrigins(env, origins, request);

  for (const target of targetOrigins) {
    try {
      const response = await proxyRequest(request, requestBody, target.origin, target.label);
      if (!shouldRetry(response)) {
        return response;
      }
    } catch (error) {
      console.warn(`${target.label} failed for ${url.pathname}:`, formatError(error));
    }
  }

  return new Response("All configured origins failed.", { status: 503 });
}

async function keepOriginsWarm(env: Env) {
  const apiWarmPaths = getWarmPaths(env);
  const apiTargets = Array.from(
    new Set([
      ...getConfiguredOrigins(env),
      normalizeOrigin(env.EMAIL_ORIGIN || getConfiguredOrigins(env)[0]),
    ]),
  );

  const workerTargets = parseOriginList(env.WORKER_ORIGINS, []);
  const workerWarmPaths = getWorkerWarmPaths(env);

  await Promise.all(
    [
      ...apiTargets.flatMap((origin) =>
        apiWarmPaths.map(async (path) => {
          const healthUrl = `${origin}${path}`;
          try {
            const response = await fetch(healthUrl, {
              method: "GET",
              headers: {
                "user-agent": "vyaparx-edge-keepalive",
              },
            });
            console.log(`[keepalive] ${healthUrl} -> ${response.status}`);
          } catch (error) {
            console.error(`[keepalive] ${healthUrl} failed:`, formatError(error));
          }
        }),
      ),
      ...workerTargets.flatMap((origin) =>
        workerWarmPaths.map(async (path) => {
        const healthUrl = `${origin}${path}`;
        try {
          const response = await fetch(healthUrl, {
            method: "GET",
            headers: {
              "user-agent": "vyaparx-edge-keepalive",
            },
          });
          console.log(`[keepalive] ${healthUrl} -> ${response.status}`);
        } catch (error) {
          console.error(`[keepalive] ${healthUrl} failed:`, formatError(error));
        }
        }),
      ),
    ],
  );
}

async function proxyRequest(
  request: Request,
  requestBody: ArrayBuffer | undefined,
  targetOrigin: string,
  targetLabel: string,
) {
  const incomingUrl = new URL(request.url);
  const targetUrl = `${targetOrigin}${incomingUrl.pathname}${incomingUrl.search}`;
  const headers = new Headers(request.headers);

  headers.delete("host");
  headers.set("x-forwarded-host", incomingUrl.host);
  headers.set("x-forwarded-proto", incomingUrl.protocol.replace(":", ""));
  headers.set("x-vyaparx-edge-target", targetLabel);

  return fetch(targetUrl, {
    method: request.method,
    headers,
    body: requestBody,
    redirect: "manual",
  });
}

function getConfiguredOrigins(env: Env) {
  return [env.ORIGIN_1, env.ORIGIN_2, env.ORIGIN_3, env.ORIGIN_4]
    .filter(Boolean)
    .map((origin) => normalizeOrigin(origin));
}

function getReadOrigins(env: Env, fallbackOrigins: string[], request: Request) {
  const configuredReadOrigins = parseOriginList(env.READ_ORIGINS, fallbackOrigins);
  const orderedOrigins = orderOriginsForRequest(configuredReadOrigins, request);

  return orderedOrigins.map((origin, index) => ({
    origin,
    label: index === 0 ? "read-primary" : `read-fallback-${index}`,
  }));
}

function getWriteOrigins(env: Env, fallbackOrigins: string[]) {
  const primaryWriteOrigin = normalizeOrigin(env.WRITE_ORIGIN || fallbackOrigins[0]);
  const failoverOrigins = fallbackOrigins.filter((origin) => origin !== primaryWriteOrigin);

  return [
    { origin: primaryWriteOrigin, label: "write-primary" },
    ...failoverOrigins.map((origin, index) => ({
      origin,
      label: `write-fallback-${index + 1}`,
    })),
  ];
}

function parseOriginList(value: string | undefined, fallbackOrigins: string[]) {
  if (!value?.trim()) {
    return fallbackOrigins;
  }

  const parsed = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => normalizeOrigin(origin));

  return parsed.length ? parsed : fallbackOrigins;
}

function getWarmPaths(env: Env) {
  if (env.WARM_PATHS?.trim()) {
    const parsed = env.WARM_PATHS
      .split(",")
      .map((path) => path.trim())
      .filter(Boolean)
      .map((path) => normalizePath(path));

    if (parsed.length > 0) {
      return parsed;
    }
  }

  if (env.HEALTH_PATH?.trim()) {
    return [normalizePath(env.HEALTH_PATH)];
  }

  return ["/health", "/health/cache"];
}

function getWorkerWarmPaths(env: Env) {
  if (env.WORKER_WARM_PATHS?.trim()) {
    const parsed = env.WORKER_WARM_PATHS
      .split(",")
      .map((path) => path.trim())
      .filter(Boolean)
      .map((path) => normalizePath(path));

    if (parsed.length > 0) {
      return parsed;
    }
  }

  return ["/health", "/health/queue"];
}

function orderOriginsForRequest(origins: string[], request: Request) {
  if (origins.length <= 1) {
    return origins;
  }

  const startIndex = stableBucket(request, origins.length);
  return origins.map((_, index) => origins[(startIndex + index) % origins.length] as string);
}

function isEmailRoute(pathname: string) {
  return EMAIL_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname));
}

function isWriteMethod(method: string) {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

function normalizeOrigin(origin: string | undefined) {
  if (!origin) {
    throw new Error("Missing required Worker origin configuration.");
  }

  return origin.replace(/\/+$/, "");
}

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

function stableBucket(request: Request, modulo: number) {
  const url = new URL(request.url);
  const fingerprint =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for") ||
    request.headers.get("cf-ray") ||
    `${request.method}:${url.pathname}:${url.search}`;

  let hash = 0;
  for (let index = 0; index < fingerprint.length; index += 1) {
    hash = (hash * 31 + fingerprint.charCodeAt(index)) >>> 0;
  }

  return hash % modulo;
}

async function readRequestBody(request: Request) {
  if (request.method === "GET" || request.method === "HEAD") {
    return undefined;
  }

  const body = await request.arrayBuffer();
  return body.byteLength > 0 ? body : undefined;
}

function shouldRetry(response: Response) {
  return RETRYABLE_STATUS_CODES.has(response.status);
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
