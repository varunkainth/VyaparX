import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import express from "express";
import type { Server } from "node:http";
import { businessGuard } from "../../middleware/businessGaurd";

let server: Server;
let baseUrl = "";

describe("businessGuard integration", () => {
    beforeAll(async () => {
        const app = express();
        app.use(express.json());

        app.use((req, _res, next) => {
            const tokenBusinessId = req.headers["x-token-business-id"];
            req.user = {
                id: "user-1",
                business_id: Array.isArray(tokenBusinessId) ? tokenBusinessId[0] : tokenBusinessId,
                role: "owner",
            };
            next();
        });

        app.get("/businesses/:business_id/guard-check", businessGuard, (_req, res) => {
            res.status(200).json({ success: true });
        });

        await new Promise<void>((resolve) => {
            server = app.listen(0, "127.0.0.1", () => resolve());
        });

        const addr = server.address();
        if (!addr || typeof addr === "string") {
            throw new Error("Failed to bind test server");
        }
        baseUrl = `http://127.0.0.1:${addr.port}`;
    });

    afterAll(async () => {
        await new Promise<void>((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()));
        });
    });

    test("allows request when token business matches route business", async () => {
        const res = await fetch(`${baseUrl}/businesses/biz-1/guard-check`, {
            headers: { "x-token-business-id": "biz-1" },
        });
        expect(res.status).toBe(200);
    });

    test("rejects request when token business differs from route business", async () => {
        const res = await fetch(`${baseUrl}/businesses/biz-1/guard-check`, {
            headers: { "x-token-business-id": "biz-2" },
        });
        expect(res.status).toBe(403);
        const body = (await res.json()) as { error?: { code?: string } };
        expect(body.error?.code).toBe("BUSINESS_ACCESS_DENIED");
    });
});

