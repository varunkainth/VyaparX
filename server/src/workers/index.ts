import { createServer, type Server } from "node:http";
import { closeQueueConnections, getQueueHealth, startWorkers } from "../services/queue.service";

const workers = startWorkers();
const workerPort = Number.parseInt(process.env.PORT || "3000", 10);

let healthServer: Server | null = null;

if (workers.length === 0) {
    console.warn("[worker] No workers started. Check QUEUE_ENABLED and REDIS_URL.");
}

healthServer = createServer(async (req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");

    if (req.method === "GET" && url.pathname === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
            JSON.stringify({
                success: true,
                message: "Success",
                data: {
                    status: "ok",
                    service: "worker",
                    uptime: process.uptime(),
                    timestamp: new Date().toISOString(),
                },
            })
        );
        return;
    }

    if (req.method === "GET" && url.pathname === "/health/queue") {
        const data = await getQueueHealth();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
            JSON.stringify({
                success: true,
                message: "Success",
                data,
            })
        );
        return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(
        JSON.stringify({
            success: false,
            error: {
                code: "NOT_FOUND",
                message: `Route ${req.method ?? "GET"} ${url.pathname} not found`,
            },
        })
    );
});

healthServer.listen(workerPort, "0.0.0.0", () => {
    console.log(`[worker] Health server listening on http://0.0.0.0:${workerPort}`);
});

const shutdown = async (signal: string) => {
    console.log(`[worker] ${signal} received. Shutting down workers...`);

    if (healthServer) {
        await new Promise<void>((resolve, reject) => {
            healthServer?.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
    }
    await Promise.all(workers.map((worker) => worker.close()));
    await closeQueueConnections();
    process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
