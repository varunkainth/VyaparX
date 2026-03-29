import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import env from "../config/env";
import { ERROR_CODES } from "../constants/errorCodes";
import { businessRepository } from "../repository/business.repository";
import { invoiceRepository } from "../repository/invoice.repository";
import { partyRepository } from "../repository/party.repository";
import {
    buildInvoiceDetailCacheKey,
    buildInvoiceListCacheKey,
    buildPublicInvoiceCacheKey,
    cacheTtlSeconds,
    getOrSetCache,
    invalidateBusinessFinancialCache,
} from "../services/cache.service";
import { invoiceSettingsRepository } from "../repository/invoice-settings.repository";
import { cancelInvoice, getInvoiceById, listInvoices } from "../services/invoice.service";
import { logAuditEvent } from "../services/audit.service";
import type { CancelInvoiceBody, InvoiceParams, InvoicePdfQueryRaw, InvoicePdfTemplate } from "../types/invoice";
import { AppError } from "../utils/appError";
import { createInvoicePdfDocument } from "../utils/invoicePdf";
import { sendSuccess } from "../utils/responseHandler";
import { invoicePdfQuerySchema, listInvoicesQuerySchema } from "../validators/invoice.validator";

const getBusinessId = (req: Request<{ business_id: string }>): string => {
    const raw = req.params.business_id;
    const businessId = Array.isArray(raw) ? raw[0] : raw;
    if (!businessId) {
        throw new AppError("Business ID missing in route", 400, ERROR_CODES.BAD_REQUEST);
    }
    return businessId;
};

const getInvoiceId = (req: Request<InvoiceParams>): string => {
    const raw = req.params.invoice_id;
    const invoiceId = Array.isArray(raw) ? raw[0] : raw;
    if (!invoiceId) {
        throw new AppError("Invoice ID missing in route", 400, ERROR_CODES.BAD_REQUEST);
    }
    return invoiceId;
};

type InvoiceShareTokenPayload = {
    business_id: string;
    invoice_id: string;
};

const invoiceShareSecret = `${env.JWT_ACCESS_SECRET}:invoice-share`;

const createInvoiceShareToken = (
    payload: InvoiceShareTokenPayload,
    issuedAt: Date,
    expiresAt: Date
) => {
    return jwt.sign(
        {
            ...payload,
            iat: Math.floor(issuedAt.getTime() / 1000),
            exp: Math.floor(expiresAt.getTime() / 1000),
        },
        invoiceShareSecret,
        {
            noTimestamp: true,
        }
    );
};

const buildInvoiceShareUrl = (invoiceId: string, token: string) => {
    const frontendUrl = env.FRONTEND_URL || "http://localhost:3000";
    return `${frontendUrl}/shared/invoice/${invoiceId}?token=${encodeURIComponent(token)}`;
};

const verifyInvoiceShareToken = (token: string, invoiceId: string): InvoiceShareTokenPayload => {
    try {
        const decoded = jwt.verify(token, invoiceShareSecret) as InvoiceShareTokenPayload;
        if (!decoded?.business_id || decoded.invoice_id !== invoiceId) {
            throw new AppError("Invalid invoice share token", 401, ERROR_CODES.UNAUTHORIZED);
        }
        return decoded;
    } catch {
        throw new AppError("Invalid or expired invoice share token", 401, ERROR_CODES.UNAUTHORIZED);
    }
};

const extractInvoiceShareToken = (req: Request): string | null => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice(7).trim();
        if (token) {
            return token;
        }
    }

    const headerToken = req.headers["x-share-token"];
    if (typeof headerToken === "string" && headerToken.trim().length > 0) {
        return headerToken.trim();
    }

    const queryToken = req.query.token;
    if (typeof queryToken === "string" && queryToken.trim().length > 0) {
        return queryToken.trim();
    }

    return null;
};

const buildInvoicePublicData = async (businessId: string, invoiceId: string) => {
    const invoice = await getInvoiceById(businessId, invoiceId);
    const [business, party, invoiceSettings] = await Promise.all([
        businessRepository.getBusinessById(businessId),
        partyRepository.getPartyById(businessId, String(invoice.party_id)),
        invoiceSettingsRepository.getOrCreate(businessId),
    ]);

    return {
        invoice,
        business: business ?? null,
        party: party ?? null,
        invoice_settings: invoiceSettings,
    };
};

export const listInvoicesHandler = async (
    req: Request<{ business_id: string }>,
    res: Response
) => {
    const businessId = getBusinessId(req);
    const parsed = listInvoicesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        throw new AppError("Validation failed", 400, ERROR_CODES.VALIDATION_ERROR, parsed.error.issues);
    }

    const payload = {
        business_id: businessId,
        ...parsed.data,
    };
    const cacheKey = await buildInvoiceListCacheKey(businessId, payload);
    const result = await getOrSetCache(cacheKey, cacheTtlSeconds.invoiceList, () => listInvoices(payload));

    return sendSuccess(res, {
        message: "Invoices fetched",
        data: result,
    });
};

export const getInvoiceHandler = async (req: Request<InvoiceParams>, res: Response) => {
    const businessId = getBusinessId(req);
    const invoiceId = getInvoiceId(req);

    const cacheKey = await buildInvoiceDetailCacheKey(businessId, invoiceId);
    const invoice = await getOrSetCache(cacheKey, cacheTtlSeconds.invoiceDetail, () =>
        getInvoiceById(businessId, invoiceId)
    );
    return sendSuccess(res, {
        message: "Invoice fetched",
        data: invoice,
    });
};

export const cancelInvoiceHandler = async (
    req: Request<InvoiceParams, unknown, CancelInvoiceBody>,
    res: Response
) => {
    if (!req.user?.id) {
        throw new AppError("Authentication required", 401, ERROR_CODES.UNAUTHORIZED);
    }

    const businessId = getBusinessId(req);
    const invoiceId = getInvoiceId(req);
    const { cancel_reason } = req.body;

    const result = await cancelInvoice({
        business_id: businessId,
        invoice_id: invoiceId,
        cancelled_by: req.user.id,
        cancel_reason,
    });

    await logAuditEvent({
        business_id: businessId,
        actor_user_id: req.user.id,
        action: "invoice_cancelled",
        entity_type: "invoice",
        entity_id: invoiceId,
        metadata: { cancel_reason: cancel_reason ?? null },
    });

    return sendSuccess(res, {
        message: "Invoice cancelled",
        data: result,
    });
};

export const downloadInvoicePdfHandler = async (
    req: Request<InvoiceParams, unknown, unknown, InvoicePdfQueryRaw>,
    res: Response
) => {
    if (!req.user?.id) {
        throw new AppError("Authentication required", 401, ERROR_CODES.UNAUTHORIZED);
    }

    const parsed = invoicePdfQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        throw new AppError("Validation failed", 400, ERROR_CODES.VALIDATION_ERROR, parsed.error.issues);
    }

    const businessId = getBusinessId(req);
    const invoiceId = getInvoiceId(req);
    const invoice = await getInvoiceById(businessId, invoiceId);

    const [business, party, invoiceSettings] = await Promise.all([
        businessRepository.getBusinessForUser(businessId, req.user.id),
        partyRepository.getPartyById(businessId, String(invoice.party_id)),
        invoiceSettingsRepository.getOrCreate(businessId),
    ]);

    // Map database template names to PDF template names
    const templateMap: Record<string, InvoicePdfTemplate> = {
        default: "bill_pro",
        modern: "modern",
        classic: "classic",
        minimal: "compact",
    };

    // Use template from query string if provided, otherwise use from settings
    const template = parsed.data.template || templateMap[invoiceSettings.default_template] || "bill_pro";

    const pdfDoc = createInvoicePdfDocument({
        businessName: business?.name ?? "Business",
        partyName: party?.name ?? "Party",
        invoice,
        template,
        business: (business as Record<string, unknown> | null) ?? undefined,
        party: (party as Record<string, unknown> | null) ?? undefined,
    });

    const safeInvoiceNo = String(invoice.invoice_number || invoice.id).replace(/[^a-zA-Z0-9-_]/g, "_");
    const fileName = `invoice-${safeInvoiceNo}-${template}.pdf`;
    res.status(200);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=\"${fileName}\"`);
    pdfDoc.on("error", (error) => {
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: { code: ERROR_CODES.INTERNAL_ERROR, message: "Failed to generate PDF" },
            });
            return;
        }
        res.destroy(error);
    });
    pdfDoc.pipe(res);
    pdfDoc.end();
    return;
};

export const createInvoiceShareLinkHandler = async (req: Request<InvoiceParams>, res: Response) => {
    const businessId = getBusinessId(req);
    const invoiceId = getInvoiceId(req);

    await getInvoiceById(businessId, invoiceId);
    const existingShareWindow = await invoiceRepository.getInvoiceShareWindow(businessId, invoiceId);
    const now = Date.now();

    let shareIssuedAt =
        existingShareWindow?.share_issued_at ? new Date(existingShareWindow.share_issued_at) : null;
    let shareExpiresAt =
        existingShareWindow?.share_expires_at ? new Date(existingShareWindow.share_expires_at) : null;

    const hasReusableShareWindow =
        shareIssuedAt &&
        shareExpiresAt &&
        !Number.isNaN(shareIssuedAt.getTime()) &&
        !Number.isNaN(shareExpiresAt.getTime()) &&
        shareExpiresAt.getTime() > now;

    if (!hasReusableShareWindow) {
        shareIssuedAt = new Date(now);
        shareExpiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000);

        await invoiceRepository.updateInvoiceShareWindow(
            businessId,
            invoiceId,
            shareIssuedAt.toISOString(),
            shareExpiresAt.toISOString()
        );
        await invalidateBusinessFinancialCache(businessId, [invoiceId]);
    }

    const resolvedShareIssuedAt = shareIssuedAt ?? new Date(now);
    const resolvedShareExpiresAt = shareExpiresAt ?? new Date(now + 7 * 24 * 60 * 60 * 1000);

    const token = createInvoiceShareToken(
        {
            business_id: businessId,
            invoice_id: invoiceId,
        },
        resolvedShareIssuedAt,
        resolvedShareExpiresAt
    );
    const shareUrl = buildInvoiceShareUrl(invoiceId, token);

    return sendSuccess(res, {
        message: "Invoice share link generated",
        data: {
            share_url: shareUrl,
            expires_at: resolvedShareExpiresAt.toISOString(),
        },
    });
};

export const getPublicInvoiceHandler = async (
    req: Request<InvoiceParams, unknown, unknown, { token?: string }>,
    res: Response
) => {
    const invoiceId = getInvoiceId(req);
    const token = extractInvoiceShareToken(req);

    if (!token) {
        throw new AppError("Share token is required", 400, ERROR_CODES.BAD_REQUEST);
    }

    const { business_id: businessId } = verifyInvoiceShareToken(token, invoiceId);
    const cacheKey = await buildPublicInvoiceCacheKey(businessId, invoiceId);
    const data = await getOrSetCache(cacheKey, cacheTtlSeconds.publicInvoice, () =>
        buildInvoicePublicData(businessId, invoiceId)
    );

    return sendSuccess(res, {
        message: "Public invoice fetched",
        data,
    });
};

export const downloadPublicInvoicePdfHandler = async (
    req: Request<InvoiceParams, unknown, unknown, InvoicePdfQueryRaw & { token?: string }>,
    res: Response
) => {
    const parsed = invoicePdfQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        throw new AppError("Validation failed", 400, ERROR_CODES.VALIDATION_ERROR, parsed.error.issues);
    }

    const invoiceId = getInvoiceId(req);
    const token = extractInvoiceShareToken(req);

    if (!token) {
        throw new AppError("Share token is required", 400, ERROR_CODES.BAD_REQUEST);
    }

    const { business_id: businessId } = verifyInvoiceShareToken(token, invoiceId);
    const { invoice, business, party, invoice_settings } = await buildInvoicePublicData(businessId, invoiceId);

    const templateMap: Record<string, InvoicePdfTemplate> = {
        default: "bill_pro",
        modern: "modern",
        classic: "classic",
        minimal: "compact",
    };

    const template = parsed.data.template || templateMap[invoice_settings.default_template] || "bill_pro";

    const pdfDoc = createInvoicePdfDocument({
        businessName: business?.name ?? "Business",
        partyName: party?.name ?? "Party",
        invoice,
        template,
        business: (business as Record<string, unknown> | null) ?? undefined,
        party: (party as Record<string, unknown> | null) ?? undefined,
    });

    const safeInvoiceNo = String(invoice.invoice_number || invoice.id).replace(/[^a-zA-Z0-9-_]/g, "_");
    const fileName = `invoice-${safeInvoiceNo}-${template}.pdf`;
    res.status(200);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=\"${fileName}\"`);
    pdfDoc.on("error", (error) => {
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: { code: ERROR_CODES.INTERNAL_ERROR, message: "Failed to generate PDF" },
            });
            return;
        }
        res.destroy(error);
    });
    pdfDoc.pipe(res);
    pdfDoc.end();
};
