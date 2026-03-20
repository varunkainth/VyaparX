import { pinoHttp } from "pino-http";
import { logger } from "../utils/logger";
import { randomUUID } from "crypto";

const sanitizeUrl = (url: string | undefined) => url?.split("?")[0] ?? "/";

export const requestLogger = pinoHttp({
    logger,
    autoLogging: true,
    serializers: {
        req: (req) => ({
            id: req.id,
            method: req.method,
            url: sanitizeUrl(req.url),
            remoteAddress: req.socket?.remoteAddress,
            userAgent: req.headers["user-agent"],
        }),
    },
    genReqId: (req, res) => {
        const existingId = req.id ?? req.headers['x-request-id'];
        if (existingId) return existingId;
        const id = randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
    },
    customLogLevel: (req, res, err) => {
        if (res.statusCode >= 500 || err) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
    },
    customSuccessMessage: (req, res) => {
        return `${req.method} ${sanitizeUrl(req.url)} ${res.statusCode}`;
    },
    customErrorMessage: (req, res, err) => {
        return `${req.method} ${sanitizeUrl(req.url)} ${res.statusCode} - ${err.message}`;
    },
    customAttributeKeys: {
        req: 'request',
        res: 'response',
        err: 'error',
        responseTime: 'duration'
    }
});
