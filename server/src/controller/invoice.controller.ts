import type { Request, Response } from "express";
import { ERROR_CODES } from "../constants/errorCodes";
import { businessRepository } from "../repository/business.repository";
import { partyRepository } from "../repository/party.repository";
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

export const listInvoicesHandler = async (
    req: Request<{ business_id: string }>,
    res: Response
) => {
    const businessId = getBusinessId(req);
    const parsed = listInvoicesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        throw new AppError("Validation failed", 400, ERROR_CODES.VALIDATION_ERROR, parsed.error.issues);
    }

    const result = await listInvoices({
        business_id: businessId,
        ...parsed.data,
    });

    return sendSuccess(res, {
        message: "Invoices fetched",
        data: result,
    });
};

export const getInvoiceHandler = async (req: Request<InvoiceParams>, res: Response) => {
    const businessId = getBusinessId(req);
    const invoiceId = getInvoiceId(req);

    const invoice = await getInvoiceById(businessId, invoiceId);
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
