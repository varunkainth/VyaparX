import { Queue, type JobsOptions, Worker } from "bullmq";
import IORedis from "ioredis";
import env from "../config/env";
import { sendInvoiceEmailNow, type SendInvoiceEmailJobData } from "./invoice-email.service";
import { ensureInvoicePdfStored } from "./invoice-pdf-storage.service";

const queuePrefix = env.QUEUE_PREFIX || "vyaparx";

const queueConnection =
    env.QUEUE_ENABLED && env.REDIS_URL
        ? new IORedis(env.REDIS_URL, {
              lazyConnect: true,
              maxRetriesPerRequest: null,
          })
        : null;

if (queueConnection) {
    queueConnection.on("error", (error) => {
        console.warn("[queue] Redis connection error", error);
    });
}

const createQueue = <T>(name: string) => {
    if (!queueConnection) return null;

    return new Queue<T>(name, {
        connection: queueConnection,
        prefix: queuePrefix,
        defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 500,
        },
    });
};

export const invoiceEmailQueueName = "invoice-email";
export const pdfGenerationQueueName = "invoice-pdf-generation";

const invoiceEmailQueue = createQueue<SendInvoiceEmailJobData>(invoiceEmailQueueName);
const pdfGenerationQueue = createQueue<{ business_id: string; invoice_id: string }>(pdfGenerationQueueName);

const invoiceEmailJobOptions: JobsOptions = {
    attempts: 3,
    backoff: {
        type: "exponential",
        delay: 5_000,
    },
};

export const isQueueEnabled = () => Boolean(queueConnection);

export const enqueueInvoiceEmail = async (data: SendInvoiceEmailJobData) => {
    if (!invoiceEmailQueue) {
        return null;
    }

    try {
        return await invoiceEmailQueue.add(
            `invoice:${data.invoice_id}:email:${data.recipient_email}`,
            data,
            invoiceEmailJobOptions
        );
    } catch (error) {
        console.warn("[queue] Failed to enqueue invoice email job", error);
        return null;
    }
};

export const enqueueInvoicePdfGeneration = async (data: { business_id: string; invoice_id: string }) => {
    if (!pdfGenerationQueue) {
        return null;
    }

    try {
        return await pdfGenerationQueue.add(`invoice:${data.invoice_id}:pdf`, data, {
            attempts: 3,
            backoff: {
                type: "exponential",
                delay: 10_000,
            },
            removeOnComplete: 100,
            removeOnFail: 500,
        });
    } catch (error) {
        console.warn("[queue] Failed to enqueue invoice pdf generation job", error);
        return null;
    }
};

export const startWorkers = () => {
    if (!queueConnection) {
        console.log("[queue] BullMQ is disabled");
        return [];
    }

    const invoiceEmailWorker = new Worker<SendInvoiceEmailJobData>(
        invoiceEmailQueueName,
        async (job) => sendInvoiceEmailNow(job.data),
        {
            connection: queueConnection,
            prefix: queuePrefix,
            concurrency: env.INVOICE_EMAIL_QUEUE_CONCURRENCY,
        }
    );

    invoiceEmailWorker.on("completed", (job) => {
        console.log(`[queue] invoice email job completed (${job.id})`);
    });

    invoiceEmailWorker.on("failed", (job, error) => {
        console.error(`[queue] invoice email job failed (${job?.id ?? "unknown"})`, error);
    });

    invoiceEmailWorker.on("error", (error) => {
        console.warn("[queue] invoice email worker error", error);
    });

    const pdfWorker = new Worker<{ business_id: string; invoice_id: string }>(
        pdfGenerationQueueName,
        async (job) => ensureInvoicePdfStored(job.data.business_id, job.data.invoice_id, { forceRegenerate: true }),
        {
            connection: queueConnection,
            prefix: queuePrefix,
            concurrency: env.PDF_QUEUE_CONCURRENCY,
        }
    );

    pdfWorker.on("completed", (job) => {
        console.log(`[queue] invoice pdf job completed (${job.id})`);
    });

    pdfWorker.on("failed", (job, error) => {
        console.error(`[queue] invoice pdf job failed (${job?.id ?? "unknown"})`, error);
    });

    pdfWorker.on("error", (error) => {
        console.warn("[queue] invoice pdf worker error", error);
    });

    console.log(
        `[queue] BullMQ worker started (${invoiceEmailQueueName}, concurrency=${env.INVOICE_EMAIL_QUEUE_CONCURRENCY})`
    );
    console.log(
        `[queue] BullMQ worker started (${pdfGenerationQueueName}, concurrency=${env.PDF_QUEUE_CONCURRENCY})`
    );

    return [invoiceEmailWorker, pdfWorker];
};

export const getQueueHealth = async () => {
    if (!env.QUEUE_ENABLED) {
        return {
            enabled: false,
            configured: Boolean(env.REDIS_URL),
            status: "disabled" as const,
        };
    }

    if (!queueConnection) {
        return {
            enabled: true,
            configured: false,
            status: "unconfigured" as const,
        };
    }

    try {
        const response = await queueConnection.ping();
        return {
            enabled: true,
            configured: true,
            status: response.toUpperCase() === "PONG" ? ("ok" as const) : ("degraded" as const),
            response,
        };
    } catch (error) {
        return {
            enabled: true,
            configured: true,
            status: "error" as const,
            error: error instanceof Error ? error.message : "Unknown queue error",
        };
    }
};

export const closeQueueConnections = async () => {
    if (!queueConnection) return;
    await queueConnection.quit();
};
