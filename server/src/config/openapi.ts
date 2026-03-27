export const openApiSpec = {
    openapi: "3.0.3",
    info: {
        title: "VyaparX API",
        version: "1.0.0",
        description: "VyaparX backend API documentation",
    },
    servers: [{ url: "/" }],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
            },
        },
        schemas: {
            AnalyticsEvent: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    business_id: { type: "string" },
                    event_type: { type: "string" },
                    entity_type: { type: "string", nullable: true },
                    entity_id: { type: "string", nullable: true },
                    actor_user_id: { type: "string", nullable: true },
                    occurred_at: { type: "string", format: "date-time" },
                    event_data: { type: "object", additionalProperties: true, nullable: true },
                },
            },
            AnalyticsEventTypeCount: {
                type: "object",
                properties: {
                    event_type: { type: "string" },
                    count: { type: "integer" },
                },
            },
            AnalyticsOverviewResponse: {
                type: "object",
                properties: {
                    business_id: { type: "string" },
                    since: { type: "string", format: "date-time" },
                    total_events: { type: "integer" },
                    events_by_type: {
                        type: "array",
                        items: { $ref: "#/components/schemas/AnalyticsEventTypeCount" },
                    },
                    totals: {
                        type: "object",
                        properties: {
                            invoice_amount: { type: "number" },
                            payment_amount: { type: "number" },
                        },
                        required: ["invoice_amount", "payment_amount"],
                    },
                },
                required: ["business_id", "since", "total_events", "events_by_type", "totals"],
            },
            AnalyticsEventsResponse: {
                type: "object",
                properties: {
                    items: {
                        type: "array",
                        items: { $ref: "#/components/schemas/AnalyticsEvent" },
                    },
                },
            },
            AnalyticsRollup: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    business_id: { type: "string" },
                    event_date: { type: "string", format: "date" },
                    event_type: { type: "string" },
                    event_count: { type: "integer" },
                    invoice_amount: { type: "number" },
                    payment_amount: { type: "number" },
                    updated_at: { type: "string", format: "date-time" },
                },
            },
            AnalyticsRollupsResponse: {
                type: "object",
                properties: {
                    items: {
                        type: "array",
                        items: { $ref: "#/components/schemas/AnalyticsRollup" },
                    },
                },
            },
        },
    },
    paths: {
        "/health": { get: { summary: "Health check", responses: { "200": { description: "OK" } } } },
        "/meta/error-codes": { get: { summary: "Get error codes", responses: { "200": { description: "OK" } } } },

        "/auth/signup": {
            post: {
                summary: "Signup",
                requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
                responses: { "201": { description: "Created" }, "400": { description: "Validation error" } },
            },
        },
        "/auth/login": {
            post: {
                summary: "Login",
                requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
                responses: { "200": { description: "OK" }, "401": { description: "Invalid credentials" } },
            },
        },
        "/auth/refresh": {
            post: {
                summary: "Refresh token",
                security: [{ bearerAuth: [] }],
                responses: { "200": { description: "OK" }, "401": { description: "Unauthorized" } },
            },
        },
        "/auth/me": {
            get: {
                summary: "Get current user",
                security: [{ bearerAuth: [] }],
                responses: { "200": { description: "OK" } },
            },
            patch: {
                summary: "Update current user",
                security: [{ bearerAuth: [] }],
                requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
                responses: { "200": { description: "OK" } },
            },
        },
        "/auth/change-password": {
            post: {
                summary: "Change password",
                security: [{ bearerAuth: [] }],
                requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
                responses: { "200": { description: "OK" } },
            },
        },
        "/auth/switch-business": {
            post: {
                summary: "Switch business context",
                security: [{ bearerAuth: [] }],
                requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
                responses: { "200": { description: "OK" } },
            },
        },
        "/auth/logout": {
            post: {
                summary: "Logout",
                security: [{ bearerAuth: [] }],
                responses: { "200": { description: "OK" } },
            },
        },

        "/api/v1/invoices/sales": {
            post: {
                summary: "Create sales invoice",
                security: [{ bearerAuth: [] }],
                parameters: [{ in: "header", name: "x-idempotency-key", schema: { type: "string" } }],
                requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
                responses: { "200": { description: "OK" } },
            },
        },
        "/api/v1/invoices/purchase": {
            post: {
                summary: "Create purchase invoice",
                security: [{ bearerAuth: [] }],
                parameters: [{ in: "header", name: "x-idempotency-key", schema: { type: "string" } }],
                requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
                responses: { "200": { description: "OK" } },
            },
        },
        "/api/v1/businesses/{business_id}/invoices/{invoice_id}/notes": {
            post: {
                summary: "Create credit/debit note for invoice",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "business_id", required: true, schema: { type: "string" } },
                    { in: "path", name: "invoice_id", required: true, schema: { type: "string" } },
                    { in: "header", name: "x-idempotency-key", schema: { type: "string" } },
                ],
                requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
                responses: { "200": { description: "OK" } },
            },
        },
        "/api/v1/payments": {
            post: {
                summary: "Create payment",
                security: [{ bearerAuth: [] }],
                parameters: [{ in: "header", name: "x-idempotency-key", schema: { type: "string" } }],
                requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
                responses: { "200": { description: "OK" } },
            },
        },

        "/api/v1/businesses": {
            get: { summary: "List businesses", security: [{ bearerAuth: [] }], responses: { "200": { description: "OK" } } },
            post: {
                summary: "Create business",
                security: [{ bearerAuth: [] }],
                requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
                responses: { "201": { description: "Created" } },
            },
        },
        "/api/v1/businesses/{business_id}": {
            get: {
                summary: "Get business",
                security: [{ bearerAuth: [] }],
                parameters: [{ in: "path", name: "business_id", required: true, schema: { type: "string" } }],
                responses: { "200": { description: "OK" } },
            },
            patch: {
                summary: "Update business",
                security: [{ bearerAuth: [] }],
                parameters: [{ in: "path", name: "business_id", required: true, schema: { type: "string" } }],
                requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
                responses: { "200": { description: "OK" } },
            },
        },
        "/api/v1/businesses/{business_id}/members/invite": {
            post: {
                summary: "Invite business member",
                security: [{ bearerAuth: [] }],
                parameters: [{ in: "path", name: "business_id", required: true, schema: { type: "string" } }],
                requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
                responses: { "200": { description: "OK" } },
            },
        },
        "/api/v1/businesses/{business_id}/invites": {
            get: {
                summary: "List business invites",
                security: [{ bearerAuth: [] }],
                parameters: [{ in: "path", name: "business_id", required: true, schema: { type: "string" } }],
                responses: { "200": { description: "OK" } },
            },
        },
        "/api/v1/business-invites/{token}": {
            get: {
                summary: "Get business invite details",
                parameters: [{ in: "path", name: "token", required: true, schema: { type: "string" } }],
                responses: { "200": { description: "OK" } },
            },
        },
        "/api/v1/business-invites/{token}/accept": {
            post: {
                summary: "Accept business invite",
                security: [{ bearerAuth: [] }],
                parameters: [{ in: "path", name: "token", required: true, schema: { type: "string" } }],
                responses: { "200": { description: "OK" } },
            },
        },
        "/api/v1/businesses/{business_id}/invites/{invite_id}/revoke": {
            post: {
                summary: "Revoke a pending business invite",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "business_id", required: true, schema: { type: "string" } },
                    { in: "path", name: "invite_id", required: true, schema: { type: "string" } },
                ],
                responses: { "200": { description: "OK" } },
            },
        },
        "/api/v1/businesses/{business_id}/members/{user_id}/role": {
            patch: {
                summary: "Update business member role",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "business_id", required: true, schema: { type: "string" } },
                    { in: "path", name: "user_id", required: true, schema: { type: "string" } },
                ],
                requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
                responses: { "200": { description: "OK" } },
            },
        },
        "/api/v1/businesses/{business_id}/members/{user_id}/status": {
            patch: {
                summary: "Update business member status",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "business_id", required: true, schema: { type: "string" } },
                    { in: "path", name: "user_id", required: true, schema: { type: "string" } },
                ],
                requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
                responses: { "200": { description: "OK" } },
            },
        },

        "/api/v1/businesses/{business_id}/parties": {
            get: {
                summary: "List parties",
                security: [{ bearerAuth: [] }],
                parameters: [{ in: "path", name: "business_id", required: true, schema: { type: "string" } }],
                responses: { "200": { description: "OK" } },
            },
            post: {
                summary: "Create party",
                security: [{ bearerAuth: [] }],
                parameters: [{ in: "path", name: "business_id", required: true, schema: { type: "string" } }],
                requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
                responses: { "201": { description: "Created" } },
            },
        },
        "/api/v1/businesses/{business_id}/parties/{party_id}": {
            get: {
                summary: "Get party",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "business_id", required: true, schema: { type: "string" } },
                    { in: "path", name: "party_id", required: true, schema: { type: "string" } },
                ],
                responses: { "200": { description: "OK" } },
            },
            patch: {
                summary: "Update party",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "business_id", required: true, schema: { type: "string" } },
                    { in: "path", name: "party_id", required: true, schema: { type: "string" } },
                ],
                requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
                responses: { "200": { description: "OK" } },
            },
            delete: {
                summary: "Deactivate party",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "business_id", required: true, schema: { type: "string" } },
                    { in: "path", name: "party_id", required: true, schema: { type: "string" } },
                ],
                responses: { "200": { description: "OK" } },
            },
        },

        "/api/v1/businesses/{business_id}/inventory-items": {
            get: {
                summary: "List inventory items",
                security: [{ bearerAuth: [] }],
                parameters: [{ in: "path", name: "business_id", required: true, schema: { type: "string" } }],
                responses: { "200": { description: "OK" } },
            },
            post: {
                summary: "Create inventory item",
                security: [{ bearerAuth: [] }],
                parameters: [{ in: "path", name: "business_id", required: true, schema: { type: "string" } }],
                requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
                responses: { "201": { description: "Created" } },
            },
        },
        "/api/v1/businesses/{business_id}/inventory-items/{item_id}": {
            get: {
                summary: "Get inventory item",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "business_id", required: true, schema: { type: "string" } },
                    { in: "path", name: "item_id", required: true, schema: { type: "string" } },
                ],
                responses: { "200": { description: "OK" } },
            },
            patch: {
                summary: "Update inventory item",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "business_id", required: true, schema: { type: "string" } },
                    { in: "path", name: "item_id", required: true, schema: { type: "string" } },
                ],
                requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
                responses: { "200": { description: "OK" } },
            },
            delete: {
                summary: "Deactivate inventory item",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "business_id", required: true, schema: { type: "string" } },
                    { in: "path", name: "item_id", required: true, schema: { type: "string" } },
                ],
                responses: { "200": { description: "OK" } },
            },
        },
        "/api/v1/businesses/{business_id}/inventory-items/{item_id}/adjust-stock": {
            post: {
                summary: "Adjust inventory stock",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "business_id", required: true, schema: { type: "string" } },
                    { in: "path", name: "item_id", required: true, schema: { type: "string" } },
                ],
                requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
                responses: { "200": { description: "OK" } },
            },
        },

        "/api/v1/businesses/{business_id}/invoices": {
            get: {
                summary: "List invoices",
                security: [{ bearerAuth: [] }],
                parameters: [{ in: "path", name: "business_id", required: true, schema: { type: "string" } }],
                responses: { "200": { description: "OK" } },
            },
        },
        "/api/v1/businesses/{business_id}/invoices/{invoice_id}": {
            get: {
                summary: "Get invoice",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "business_id", required: true, schema: { type: "string" } },
                    { in: "path", name: "invoice_id", required: true, schema: { type: "string" } },
                ],
                responses: { "200": { description: "OK" } },
            },
        },
        "/api/v1/businesses/{business_id}/invoices/{invoice_id}/pdf": {
            get: {
                summary: "Download invoice PDF",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "business_id", required: true, schema: { type: "string" } },
                    { in: "path", name: "invoice_id", required: true, schema: { type: "string" } },
                    {
                        in: "query",
                        name: "template",
                        required: false,
                        schema: { type: "string", enum: ["classic", "modern", "compact", "bill_pro", "bill_pro_legacy"] },
                    },
                ],
                responses: { "200": { description: "PDF file download" } },
            },
        },
        "/api/v1/businesses/{business_id}/invoices/{invoice_id}/cancel": {
            post: {
                summary: "Cancel invoice",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "business_id", required: true, schema: { type: "string" } },
                    { in: "path", name: "invoice_id", required: true, schema: { type: "string" } },
                ],
                requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
                responses: { "200": { description: "OK" } },
            },
        },

        "/api/v1/businesses/{business_id}/payments": {
            get: {
                summary: "List payments",
                security: [{ bearerAuth: [] }],
                parameters: [{ in: "path", name: "business_id", required: true, schema: { type: "string" } }],
                responses: { "200": { description: "OK" } },
            },
        },
        "/api/v1/businesses/{business_id}/payments/{payment_id}": {
            get: {
                summary: "Get payment",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "business_id", required: true, schema: { type: "string" } },
                    { in: "path", name: "payment_id", required: true, schema: { type: "string" } },
                ],
                responses: { "200": { description: "OK" } },
            },
        },
        "/api/v1/businesses/{business_id}/payments/{payment_id}/reconcile": {
            post: {
                summary: "Reconcile payment",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "business_id", required: true, schema: { type: "string" } },
                    { in: "path", name: "payment_id", required: true, schema: { type: "string" } },
                ],
                requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
                responses: { "200": { description: "OK" } },
            },
        },
        "/api/v1/businesses/{business_id}/payments/{payment_id}/unreconcile": {
            post: {
                summary: "Unreconcile payment",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "business_id", required: true, schema: { type: "string" } },
                    { in: "path", name: "payment_id", required: true, schema: { type: "string" } },
                ],
                responses: { "200": { description: "OK" } },
            },
        },

        "/api/v1/businesses/{business_id}/ledger/statement": {
            get: {
                summary: "Ledger statement",
                security: [{ bearerAuth: [] }],
                parameters: [{ in: "path", name: "business_id", required: true, schema: { type: "string" } }],
                responses: { "200": { description: "OK" } },
            },
        },
        "/api/v1/businesses/{business_id}/reports/monthly-sales": {
            get: {
                summary: "Monthly sales report",
                security: [{ bearerAuth: [] }],
                parameters: [{ in: "path", name: "business_id", required: true, schema: { type: "string" } }],
                responses: { "200": { description: "OK" } },
            },
        },
        "/api/v1/businesses/{business_id}/reports/monthly-sales/export": {
            get: {
                summary: "Export monthly sales report (CSV/XLSX)",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "business_id", required: true, schema: { type: "string" } },
                    { in: "query", name: "format", required: false, schema: { type: "string", enum: ["csv", "excel"] } },
                    { in: "query", name: "from_date", required: false, schema: { type: "string", format: "date" } },
                    { in: "query", name: "to_date", required: false, schema: { type: "string", format: "date" } },
                ],
                responses: { "200": { description: "File download" } },
            },
        },
        "/api/v1/businesses/{business_id}/reports/outstanding": {
            get: {
                summary: "Outstanding receivable/payable report",
                security: [{ bearerAuth: [] }],
                parameters: [{ in: "path", name: "business_id", required: true, schema: { type: "string" } }],
                responses: { "200": { description: "OK" } },
            },
        },
        "/api/v1/businesses/{business_id}/reports/outstanding/export": {
            get: {
                summary: "Export outstanding report (CSV/XLSX)",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "business_id", required: true, schema: { type: "string" } },
                    { in: "query", name: "format", required: false, schema: { type: "string", enum: ["csv", "excel"] } },
                ],
                responses: { "200": { description: "File download" } },
            },
        },
        "/api/v1/businesses/{business_id}/reports/gst-summary": {
            get: {
                summary: "GST summary report",
                security: [{ bearerAuth: [] }],
                parameters: [{ in: "path", name: "business_id", required: true, schema: { type: "string" } }],
                responses: { "200": { description: "OK" } },
            },
        },
        "/api/v1/businesses/{business_id}/reports/gst-summary/export": {
            get: {
                summary: "Export GST summary report (CSV/XLSX)",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "business_id", required: true, schema: { type: "string" } },
                    { in: "query", name: "format", required: false, schema: { type: "string", enum: ["csv", "excel"] } },
                    { in: "query", name: "from_date", required: false, schema: { type: "string", format: "date" } },
                    { in: "query", name: "to_date", required: false, schema: { type: "string", format: "date" } },
                    {
                        in: "query",
                        name: "invoice_type",
                        required: false,
                        schema: { type: "string", enum: ["sales", "purchase", "credit_note", "debit_note"] },
                    },
                ],
                responses: { "200": { description: "File download" } },
            },
        },
        "/api/v1/businesses/{business_id}/reports/low-stock": {
            get: {
                summary: "Low stock report",
                security: [{ bearerAuth: [] }],
                parameters: [{ in: "path", name: "business_id", required: true, schema: { type: "string" } }],
                responses: { "200": { description: "OK" } },
            },
        },
        "/api/v1/businesses/{business_id}/reports/low-stock/export": {
            get: {
                summary: "Export low stock report (CSV/XLSX)",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "business_id", required: true, schema: { type: "string" } },
                    { in: "query", name: "format", required: false, schema: { type: "string", enum: ["csv", "excel"] } },
                ],
                responses: { "200": { description: "File download" } },
            },
        },
        "/api/v1/businesses/{business_id}/reports/purchase": {
            get: {
                summary: "Purchase report",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "business_id", required: true, schema: { type: "string" } },
                    { in: "query", name: "from_date", required: false, schema: { type: "string", format: "date" } },
                    { in: "query", name: "to_date", required: false, schema: { type: "string", format: "date" } },
                ],
                responses: { "200": { description: "OK" } },
            },
        },
        "/api/v1/businesses/{business_id}/reports/purchase/export": {
            get: {
                summary: "Export purchase report (CSV/XLSX)",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "business_id", required: true, schema: { type: "string" } },
                    { in: "query", name: "format", required: false, schema: { type: "string", enum: ["csv", "excel"] } },
                    { in: "query", name: "from_date", required: false, schema: { type: "string", format: "date" } },
                    { in: "query", name: "to_date", required: false, schema: { type: "string", format: "date" } },
                ],
                responses: { "200": { description: "File download" } },
            },
        },
        "/api/v1/businesses/{business_id}/reports/profit-loss": {
            get: {
                summary: "Profit and loss report",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "business_id", required: true, schema: { type: "string" } },
                    { in: "query", name: "from_date", required: false, schema: { type: "string", format: "date" } },
                    { in: "query", name: "to_date", required: false, schema: { type: "string", format: "date" } },
                ],
                responses: { "200": { description: "OK" } },
            },
        },
        "/api/v1/businesses/{business_id}/reports/profit-loss/export": {
            get: {
                summary: "Export profit and loss report (CSV/XLSX)",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "business_id", required: true, schema: { type: "string" } },
                    { in: "query", name: "format", required: false, schema: { type: "string", enum: ["csv", "excel"] } },
                    { in: "query", name: "from_date", required: false, schema: { type: "string", format: "date" } },
                    { in: "query", name: "to_date", required: false, schema: { type: "string", format: "date" } },
                ],
                responses: { "200": { description: "File download" } },
            },
        },
        "/api/v1/businesses/{business_id}/analytics/overview": {
            get: {
                summary: "Business analytics overview",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "business_id", required: true, schema: { type: "string" } },
                    {
                        in: "query",
                        name: "since_hours",
                        required: false,
                        schema: { type: "number", minimum: 1, maximum: 168 },
                    },
                ],
                responses: {
                    "200": {
                        description: "Analytics overview metrics",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/AnalyticsOverviewResponse" },
                            },
                        },
                    },
                },
            },
        },
        "/api/v1/businesses/{business_id}/analytics/events": {
            get: {
                summary: "Recent business analytics events",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "business_id", required: true, schema: { type: "string" } },
                    {
                        in: "query",
                        name: "limit",
                        required: false,
                        schema: { type: "integer", minimum: 1, maximum: 100 },
                    },
                ],
                responses: {
                    "200": {
                        description: "Analytics event stream",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/AnalyticsEventsResponse" },
                            },
                        },
                    },
                },
            },
        },
        "/api/v1/businesses/{business_id}/analytics/rollups": {
            get: {
                summary: "Analytics rollups",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "business_id", required: true, schema: { type: "string" } },
                    {
                        in: "query",
                        name: "from_date",
                        required: false,
                        schema: { type: "string", format: "date" },
                    },
                    {
                        in: "query",
                        name: "to_date",
                        required: false,
                        schema: { type: "string", format: "date" },
                    },
                ],
                responses: {
                    "200": {
                        description: "Analytics rollups",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/AnalyticsRollupsResponse" },
                            },
                        },
                    },
                },
            },
        },
        "/api/v1/sync/push": {
            post: {
                summary: "Push offline mutations",
                security: [{ bearerAuth: [] }],
                requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
                responses: { "200": { description: "Push result" } },
            },
        },
        "/api/v1/sync/pull": {
            get: {
                summary: "Pull server-side changes since cursor",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "query", name: "business_id", required: true, schema: { type: "string" } },
                    { in: "query", name: "since", required: false, schema: { type: "integer" } },
                    { in: "query", name: "limit", required: false, schema: { type: "integer" } },
                ],
                responses: { "200": { description: "Pull result" } },
            },
        },
    },
} as const;
