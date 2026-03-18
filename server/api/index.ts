import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import { v4 as uuid } from "uuid";
import env from "../src/config/env";
import pool from "../src/config/db";
import { ERROR_CODES } from "../src/constants/errorCodes";
import { openApiSpec } from "../src/config/openapi";
import { requestLogger } from "../src/middleware/requestLogger";
import { authRateLimit, corsMiddleware, globalRateLimit, helmetMiddleware } from "../src/middleware/security";
import authRouter from "../src/routes/auth.routes";
import passwordResetRouter from "../src/routes/password-reset.routes";
import emailVerificationRouter from "../src/routes/email-verification.routes";
import businessRouter from "../src/routes/business.routes";
import financeRouter from "../src/routes/finance.routes";
import inventoryRouter from "../src/routes/inventory.routes";
import invoiceRouter from "../src/routes/invoice.routes";
import publicInvoiceRouter from "../src/routes/public-invoice.routes";
import ledgerRouter from "../src/routes/ledger.routes";
import paymentRouter from "../src/routes/payment.routes";
import partyRouter from "../src/routes/party.routes";
import analyticsRouter from "../src/routes/analytics.routes";
import reportRouter from "../src/routes/report.routes";
import syncRouter from "../src/routes/sync.routes";
import dashboardRouter from "../src/routes/dashboard.routes";
import analyticsDashboardRouter from "../src/routes/analytics-dashboard.routes";
import invoiceSettingsRouter from "../src/routes/invoice-settings.routes";
import emailRouter from "../src/routes/email.routes";
import notificationRouter from "../src/routes/notification.routes";
import { errorHandler } from "../src/utils/errorHandler";
import { sendSuccess } from "../src/utils/responseHandler";

const app = express();

app.use(express.json());
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(globalRateLimit);
app.use(requestLogger);
app.use((req, _res, next) => {
    (req as any).id = (req as any).id || uuid();
    next();
});

app.get("/", (_req, res) => {
    return sendSuccess(res, { data: { message: "VyaparX API" } });
});

app.get("/health", (_req, res) => {
    return sendSuccess(res, {
        data: {
            status: "ok",
            timestamp: new Date().toISOString(),
        },
    });
});

app.get("/test-db", async (_req, res, next) => {
    try {
        const result = await pool.query("SELECT NOW()");
        return sendSuccess(res, {
            message: "Database Connection Successful",
            data: { time: result.rows[0].now },
        });
    } catch (err) {
        return next(err);
    }
});

app.get("/meta/error-codes", (_req, res) => {
    return sendSuccess(res, {
        message: "Error codes fetched",
        data: { error_codes: ERROR_CODES },
    });
});

app.get("/openapi.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    return res.status(200).json(openApiSpec);
});

app.get("/docs", (_req, res) => {
    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>VyaparX API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
        layout: 'BaseLayout'
      });
    </script>
  </body>
</html>`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
});

app.use("/auth", authRateLimit, authRouter);
app.use("/api/v1", passwordResetRouter);
app.use("/api/v1", emailVerificationRouter);
app.use("/api/v1", publicInvoiceRouter);
app.use("/api/v1", financeRouter);
app.use("/api/v1", invoiceRouter);
app.use("/api/v1", ledgerRouter);
app.use("/api/v1", paymentRouter);
app.use("/api/v1", businessRouter);
app.use("/api/v1", partyRouter);
app.use("/api/v1", inventoryRouter);
app.use("/api/v1", reportRouter);
app.use("/api/v1", analyticsRouter);
app.use("/api/v1", syncRouter);
app.use("/api/v1", dashboardRouter);
app.use("/api/v1", analyticsDashboardRouter);
app.use("/api/v1", invoiceSettingsRouter);
app.use("/api/v1", emailRouter);
app.use("/api/v1", notificationRouter);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: ERROR_CODES.NOT_FOUND,
            message: `Route ${req.method} ${req.path} not found`,
        },
    });
});

app.use(errorHandler);

export default function handler(req: VercelRequest, res: VercelResponse) {
    return app(req, res);
}
