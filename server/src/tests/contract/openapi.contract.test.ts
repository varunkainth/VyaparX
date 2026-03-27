import { describe, expect, test } from "bun:test";
import { openApiSpec } from "../../config/openapi";

type HttpMethod = "get" | "post" | "patch" | "delete";
type OpenApiParameter = { in: string; name: string };
type OpenApiOperation = {
    security?: unknown[];
    parameters?: OpenApiParameter[];
};

const getOperation = (path: string, method: HttpMethod): OpenApiOperation => {
    const route = openApiSpec.paths[path as keyof typeof openApiSpec.paths] as
        | Partial<Record<HttpMethod, OpenApiOperation>>
        | undefined;
    expect(route).toBeDefined();
    const op = route?.[method];
    expect(op).toBeDefined();
    return op as OpenApiOperation;
};

describe("OpenAPI contract", () => {
    test("auth routes exist with expected methods", () => {
        getOperation("/auth/signup", "post");
        getOperation("/auth/login", "post");
        getOperation("/auth/refresh", "post");
        getOperation("/auth/me", "get");
        getOperation("/auth/me", "patch");
        getOperation("/auth/change-password", "post");
        getOperation("/auth/switch-business", "post");
        getOperation("/auth/logout", "post");
    });

    test("finance write routes declare security and idempotency header", () => {
        const invoiceCreate = getOperation("/api/v1/invoices/sales", "post");
        const paymentCreate = getOperation("/api/v1/payments", "post");

        expect(invoiceCreate.security?.length).toBeGreaterThan(0);
        expect(paymentCreate.security?.length).toBeGreaterThan(0);

        const invoiceHasIdempotencyHeader = (invoiceCreate.parameters ?? []).some(
            (p: OpenApiParameter) => p.in === "header" && p.name === "x-idempotency-key"
        );
        const paymentHasIdempotencyHeader = (paymentCreate.parameters ?? []).some(
            (p: OpenApiParameter) => p.in === "header" && p.name === "x-idempotency-key"
        );

        expect(invoiceHasIdempotencyHeader).toBe(true);
        expect(paymentHasIdempotencyHeader).toBe(true);
    });

    test("report export routes are documented with format query", () => {
        const routes = [
            "/api/v1/businesses/{business_id}/reports/monthly-sales/export",
            "/api/v1/businesses/{business_id}/reports/outstanding/export",
            "/api/v1/businesses/{business_id}/reports/gst-summary/export",
            "/api/v1/businesses/{business_id}/reports/low-stock/export",
            "/api/v1/businesses/{business_id}/reports/purchase/export",
            "/api/v1/businesses/{business_id}/reports/profit-loss/export",
        ] as const;

        for (const path of routes) {
            const op = getOperation(path, "get");
            expect(op.security?.length).toBeGreaterThan(0);

            const hasBusinessPathParam = (op.parameters ?? []).some(
                (p: OpenApiParameter) => p.in === "path" && p.name === "business_id"
            );
            const hasFormatQuery = (op.parameters ?? []).some(
                (p: OpenApiParameter) => p.in === "query" && p.name === "format"
            );

            expect(hasBusinessPathParam).toBe(true);
            expect(hasFormatQuery).toBe(true);
        }
    });
});
