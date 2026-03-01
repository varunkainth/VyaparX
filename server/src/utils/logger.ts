import pino from "pino";
import { createWriteStream, mkdirSync, existsSync } from "fs";
import { join } from "path";

const isProd = process.env.NODE_ENV === 'production';

// Create logs directory if needed
const logsDir = join(process.cwd(), 'logs');
if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true });
}

const streams: pino.StreamEntry[] = [
    { stream: process.stdout }
];

// Add file logging in production
if (isProd) {
    streams.push(
        { stream: createWriteStream(join(logsDir, 'app.log'), { flags: 'a' }) },
        { level: 'error', stream: createWriteStream(join(logsDir, 'error.log'), { flags: 'a' }) }
    );
}

export const logger = pino({
    level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
    formatters: {
        level: (label) => {
            return { level: label.toUpperCase() };
        },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
}, pino.multistream(streams));

export type Logger = pino.Logger;