import type { SignupInput, LoginInput, ChangePasswordInput, SwitchBusinessInput } from "./auth";
import type {
    CreateBusinessBody,
    InviteBusinessMemberBody,
    UpdateBusinessMemberRoleBody,
    UpdateBusinessMemberStatusBody,
} from "./business";
import type { JsonObject } from "./common";
import type { CreateInventoryBody, AdjustInventoryStockBody } from "./inventory";
import type { CancelInvoiceBody, InvoiceListQueryRaw, InvoicePdfQueryRaw } from "./invoice";
import type { CreateSalesInvoiceBody } from "./invoice_service";
import type { LedgerStatementQueryRaw } from "./ledger";
import type { CreatePartyBody } from "./party";
import type { PaymentListQueryRaw, ReconcilePaymentBody } from "./payment";
import type { RecordPaymentBody } from "./payment_service";
import type { DateRangeQueryRaw, GstSummaryQueryRaw } from "./report";
import type { SyncPullQueryRaw, SyncPushBody } from "./sync";
import type { PublicUser, UserRole } from "./user";

export interface ApiSuccess<T> {
    success: true;
    message: string;
    data: T;
}

export interface ApiError {
    success: false;
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
    requestId?: string;
}

export interface ApiTokens {
    accessToken: string;
    refreshToken: string;
}

export interface Pagination {
    page: number;
    limit: number;
    total: number;
}

export interface AuthSession {
    business_id: string | null;
    role: UserRole | null;
}

export type ApiRecord = Record<string, unknown>;

export interface RequestOptions {
    accessToken?: string;
    refreshToken?: string;
    idempotencyKey?: string;
}

export interface FileDownload {
    filename: string;
    contentType: string;
    content: Blob;
}

const buildQuery = (query?: Record<string, string | number | boolean | undefined>) => {
    if (!query) return "";
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) params.set(key, String(value));
    }
    const q = params.toString();
    return q ? `?${q}` : "";
};

export class OpenApiClient {
    constructor(private readonly baseUrl: string) {}

    private async request<T>(
        method: "GET" | "POST" | "PATCH" | "DELETE",
        path: string,
        payload?: unknown,
        options?: RequestOptions
    ): Promise<ApiSuccess<T>> {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };

        if (options?.accessToken) headers.Authorization = `Bearer ${options.accessToken}`;
        if (options?.refreshToken) headers.Authorization = `Bearer ${options.refreshToken}`;
        if (options?.idempotencyKey) headers["x-idempotency-key"] = options.idempotencyKey;

        const res = await fetch(`${this.baseUrl}${path}`, {
            method,
            headers,
            body: payload === undefined ? undefined : JSON.stringify(payload),
        });

        const json = (await res.json()) as ApiSuccess<T> | ApiError;
        if (!res.ok) {
            throw json as ApiError;
        }
        return json as ApiSuccess<T>;
    }

    private async requestFile(path: string, options?: RequestOptions): Promise<FileDownload> {
        const headers: Record<string, string> = {};
        if (options?.accessToken) headers.Authorization = `Bearer ${options.accessToken}`;
        if (options?.refreshToken) headers.Authorization = `Bearer ${options.refreshToken}`;

        const res = await fetch(`${this.baseUrl}${path}`, { method: "GET", headers });
        if (!res.ok) {
            const json = (await res.json()) as ApiError;
            throw json;
        }

        const contentType = res.headers.get("content-type") ?? "application/octet-stream";
        const disposition = res.headers.get("content-disposition") ?? "";
        const filenameMatch = disposition.match(/filename=\"?([^\";]+)\"?/i);
        const filename = filenameMatch?.[1] ?? "download.bin";

        return {
            filename,
            contentType,
            content: await res.blob(),
        };
    }

    getRoot() {
        return this.request<{ message: string }>("GET", "/");
    }

    getHealth() {
        return this.request<{ status: string; uptime: number; timestamp: string }>("GET", "/health");
    }

    testDb() {
        return this.request<{ time: string }>("GET", "/test-db");
    }

    getErrorCodes() {
        return this.request<{ error_codes: Record<string, string> }>("GET", "/meta/error-codes");
    }

    signup(payload: SignupInput) {
        return this.request<{ user: PublicUser; tokens: ApiTokens }>("POST", "/auth/signup", payload);
    }

    login(payload: LoginInput) {
        return this.request<{ user: PublicUser; tokens: ApiTokens }>("POST", "/auth/login", payload);
    }

    refresh(refreshToken: string) {
        return this.request<{ tokens: ApiTokens }>("POST", "/auth/refresh", undefined, { refreshToken });
    }

    me(accessToken: string) {
        return this.request<{ user: PublicUser; session: AuthSession }>("GET", "/auth/me", undefined, { accessToken });
    }

    updateMe(payload: JsonObject, accessToken: string) {
        return this.request<{ user: PublicUser }>("PATCH", "/auth/me", payload, { accessToken });
    }

    changePassword(payload: ChangePasswordInput, accessToken: string) {
        return this.request<null>("POST", "/auth/change-password", payload, { accessToken });
    }

    switchBusiness(payload: SwitchBusinessInput, accessToken: string) {
        return this.request<{ session: AuthSession; tokens: ApiTokens }>(
            "POST",
            "/auth/switch-business",
            payload,
            { accessToken }
        );
    }

    logout(accessToken: string) {
        return this.request<null>("POST", "/auth/logout", undefined, { accessToken });
    }

    createSalesInvoice(payload: CreateSalesInvoiceBody, accessToken: string, idempotencyKey?: string) {
        return this.request<{ success: boolean; invoice_id: string }>("POST", "/api/v1/invoices/sales", payload, {
            accessToken,
            idempotencyKey,
        });
    }

    createPayment(payload: RecordPaymentBody, accessToken: string, idempotencyKey?: string) {
        return this.request<{ success: boolean; payment_id: string }>("POST", "/api/v1/payments", payload, {
            accessToken,
            idempotencyKey,
        });
    }

    listBusinesses(accessToken: string) {
        return this.request<ApiRecord[]>("GET", "/api/v1/businesses", undefined, { accessToken });
    }

    createBusiness(payload: CreateBusinessBody, accessToken: string) {
        return this.request<ApiRecord>("POST", "/api/v1/businesses", payload, { accessToken });
    }

    getBusiness(businessId: string, accessToken: string) {
        return this.request<ApiRecord>("GET", `/api/v1/businesses/${businessId}`, undefined, { accessToken });
    }

    updateBusiness(businessId: string, payload: JsonObject, accessToken: string) {
        return this.request<ApiRecord>("PATCH", `/api/v1/businesses/${businessId}`, payload, { accessToken });
    }

    inviteBusinessMember(businessId: string, payload: InviteBusinessMemberBody, accessToken: string) {
        return this.request<ApiRecord>("POST", `/api/v1/businesses/${businessId}/members/invite`, payload, {
            accessToken,
        });
    }

    updateBusinessMemberRole(
        businessId: string,
        userId: string,
        payload: UpdateBusinessMemberRoleBody,
        accessToken: string
    ) {
        return this.request<ApiRecord>(
            "PATCH",
            `/api/v1/businesses/${businessId}/members/${userId}/role`,
            payload,
            { accessToken }
        );
    }

    updateBusinessMemberStatus(
        businessId: string,
        userId: string,
        payload: UpdateBusinessMemberStatusBody,
        accessToken: string
    ) {
        return this.request<ApiRecord>(
            "PATCH",
            `/api/v1/businesses/${businessId}/members/${userId}/status`,
            payload,
            { accessToken }
        );
    }

    listParties(businessId: string, accessToken: string, includeInactive?: boolean) {
        const q = buildQuery({ include_inactive: includeInactive });
        return this.request<ApiRecord[]>("GET", `/api/v1/businesses/${businessId}/parties${q}`, undefined, {
            accessToken,
        });
    }

    createParty(businessId: string, payload: CreatePartyBody, accessToken: string) {
        return this.request<ApiRecord>("POST", `/api/v1/businesses/${businessId}/parties`, payload, { accessToken });
    }

    getParty(businessId: string, partyId: string, accessToken: string) {
        return this.request<ApiRecord>("GET", `/api/v1/businesses/${businessId}/parties/${partyId}`, undefined, {
            accessToken,
        });
    }

    updateParty(businessId: string, partyId: string, payload: JsonObject, accessToken: string) {
        return this.request<ApiRecord>("PATCH", `/api/v1/businesses/${businessId}/parties/${partyId}`, payload, {
            accessToken,
        });
    }

    deleteParty(businessId: string, partyId: string, accessToken: string) {
        return this.request<ApiRecord>("DELETE", `/api/v1/businesses/${businessId}/parties/${partyId}`, undefined, {
            accessToken,
        });
    }

    listInventoryItems(businessId: string, accessToken: string, includeInactive?: boolean) {
        const q = buildQuery({ include_inactive: includeInactive });
        return this.request<ApiRecord[]>(
            "GET",
            `/api/v1/businesses/${businessId}/inventory-items${q}`,
            undefined,
            { accessToken }
        );
    }

    createInventoryItem(businessId: string, payload: CreateInventoryBody, accessToken: string) {
        return this.request<ApiRecord>("POST", `/api/v1/businesses/${businessId}/inventory-items`, payload, {
            accessToken,
        });
    }

    getInventoryItem(businessId: string, itemId: string, accessToken: string) {
        return this.request<ApiRecord>(
            "GET",
            `/api/v1/businesses/${businessId}/inventory-items/${itemId}`,
            undefined,
            { accessToken }
        );
    }

    updateInventoryItem(businessId: string, itemId: string, payload: JsonObject, accessToken: string) {
        return this.request<ApiRecord>("PATCH", `/api/v1/businesses/${businessId}/inventory-items/${itemId}`, payload, {
            accessToken,
        });
    }

    adjustInventoryStock(businessId: string, itemId: string, payload: AdjustInventoryStockBody, accessToken: string) {
        return this.request<ApiRecord>(
            "POST",
            `/api/v1/businesses/${businessId}/inventory-items/${itemId}/adjust-stock`,
            payload,
            { accessToken }
        );
    }

    deleteInventoryItem(businessId: string, itemId: string, accessToken: string) {
        return this.request<ApiRecord>(
            "DELETE",
            `/api/v1/businesses/${businessId}/inventory-items/${itemId}`,
            undefined,
            { accessToken }
        );
    }

    listInvoices(businessId: string, query: InvoiceListQueryRaw | undefined, accessToken: string) {
        const q = buildQuery(query);
        return this.request<{ items: ApiRecord[]; pagination: Pagination }>(
            "GET",
            `/api/v1/businesses/${businessId}/invoices${q}`,
            undefined,
            { accessToken }
        );
    }

    getInvoice(businessId: string, invoiceId: string, accessToken: string) {
        return this.request<ApiRecord>("GET", `/api/v1/businesses/${businessId}/invoices/${invoiceId}`, undefined, {
            accessToken,
        });
    }

    downloadInvoicePdf(
        businessId: string,
        invoiceId: string,
        query: InvoicePdfQueryRaw | undefined,
        accessToken: string
    ) {
        const q = buildQuery(query);
        return this.requestFile(`/api/v1/businesses/${businessId}/invoices/${invoiceId}/pdf${q}`, { accessToken });
    }

    cancelInvoice(businessId: string, invoiceId: string, payload: CancelInvoiceBody, accessToken: string) {
        return this.request<{ success: boolean; invoice_id: string; is_cancelled: boolean }>(
            "POST",
            `/api/v1/businesses/${businessId}/invoices/${invoiceId}/cancel`,
            payload,
            { accessToken }
        );
    }

    listPayments(businessId: string, query: PaymentListQueryRaw | undefined, accessToken: string) {
        const q = buildQuery(query);
        return this.request<{ items: ApiRecord[]; pagination: Pagination }>(
            "GET",
            `/api/v1/businesses/${businessId}/payments${q}`,
            undefined,
            { accessToken }
        );
    }

    getPayment(businessId: string, paymentId: string, accessToken: string) {
        return this.request<ApiRecord>(
            "GET",
            `/api/v1/businesses/${businessId}/payments/${paymentId}`,
            undefined,
            { accessToken }
        );
    }

    reconcilePayment(
        businessId: string,
        paymentId: string,
        payload: ReconcilePaymentBody,
        accessToken: string
    ) {
        return this.request<ApiRecord>(
            "POST",
            `/api/v1/businesses/${businessId}/payments/${paymentId}/reconcile`,
            payload,
            { accessToken }
        );
    }

    unreconcilePayment(businessId: string, paymentId: string, accessToken: string) {
        return this.request<ApiRecord>(
            "POST",
            `/api/v1/businesses/${businessId}/payments/${paymentId}/unreconcile`,
            undefined,
            { accessToken }
        );
    }

    getLedgerStatement(businessId: string, query: LedgerStatementQueryRaw | undefined, accessToken: string) {
        const q = buildQuery(query);
        return this.request<{ items: ApiRecord[]; pagination: Pagination }>(
            "GET",
            `/api/v1/businesses/${businessId}/ledger/statement${q}`,
            undefined,
            { accessToken }
        );
    }

    getMonthlySalesReport(businessId: string, query: DateRangeQueryRaw | undefined, accessToken: string) {
        const q = buildQuery(query);
        return this.request<ApiRecord[]>(
            "GET",
            `/api/v1/businesses/${businessId}/reports/monthly-sales${q}`,
            undefined,
            { accessToken }
        );
    }

    getOutstandingReport(businessId: string, accessToken: string) {
        return this.request<ApiRecord>(
            "GET",
            `/api/v1/businesses/${businessId}/reports/outstanding`,
            undefined,
            { accessToken }
        );
    }

    getGstSummaryReport(businessId: string, query: GstSummaryQueryRaw | undefined, accessToken: string) {
        const q = buildQuery(query);
        return this.request<ApiRecord[]>(
            "GET",
            `/api/v1/businesses/${businessId}/reports/gst-summary${q}`,
            undefined,
            { accessToken }
        );
    }

    getLowStockReport(businessId: string, accessToken: string) {
        return this.request<ApiRecord[]>(
            "GET",
            `/api/v1/businesses/${businessId}/reports/low-stock`,
            undefined,
            { accessToken }
        );
    }

    exportMonthlySalesReport(
        businessId: string,
        query: DateRangeQueryRaw & { format?: "csv" | "excel" } | undefined,
        accessToken: string
    ) {
        const q = buildQuery(query);
        return this.requestFile(`/api/v1/businesses/${businessId}/reports/monthly-sales/export${q}`, { accessToken });
    }

    exportOutstandingReport(
        businessId: string,
        query: { format?: "csv" | "excel" } | undefined,
        accessToken: string
    ) {
        const q = buildQuery(query);
        return this.requestFile(`/api/v1/businesses/${businessId}/reports/outstanding/export${q}`, { accessToken });
    }

    exportGstSummaryReport(
        businessId: string,
        query: GstSummaryQueryRaw & { format?: "csv" | "excel" } | undefined,
        accessToken: string
    ) {
        const q = buildQuery(query);
        return this.requestFile(`/api/v1/businesses/${businessId}/reports/gst-summary/export${q}`, { accessToken });
    }

    exportLowStockReport(
        businessId: string,
        query: { format?: "csv" | "excel" } | undefined,
        accessToken: string
    ) {
        const q = buildQuery(query);
        return this.requestFile(`/api/v1/businesses/${businessId}/reports/low-stock/export${q}`, { accessToken });
    }

    pushSync(payload: SyncPushBody, accessToken: string) {
        return this.request<{
            chunk: ApiRecord;
            summary: { total: number; applied: number; duplicate: number; conflict: number; error: number };
            results: ApiRecord[];
        }>("POST", "/api/v1/sync/push", payload, { accessToken });
    }

    pullSync(query: SyncPullQueryRaw, accessToken: string) {
        const q = buildQuery(query);
        return this.request<{ next_cursor: number; changes: ApiRecord[] }>("GET", `/api/v1/sync/pull${q}`, undefined, {
            accessToken,
        });
    }
}
