import type { Request, Response } from "express";
import { ERROR_CODES } from "../constants/errorCodes";
import {
    createSaleInvoice,
    createPurchaseInvoice,
    createInvoiceNote,
} from "../services/invoice.service";
import { recordPayment } from "../services/payment.service";
import type { CreateSalesInvoiceBody, CreateInvoiceNoteBody } from "../types/invoice_service";
import type { RecordPaymentBody } from "../types/payment_service";
import { AppError } from "../utils/appError";
import { sendSuccess } from "../utils/responseHandler";

const getIdempotencyKey = (req: Request): string | undefined => {
    const raw = req.headers["x-idempotency-key"];
    if (!raw) return undefined;
    const key = Array.isArray(raw) ? raw[0] : raw;
    if (!key || key.trim().length === 0) return undefined;
    return key.trim();
};

export const createSalesInvoiceHandler = async (
    req: Request<{}, unknown, CreateSalesInvoiceBody>,
    res: Response
) => {
    if (!req.user?.id || !req.user.business_id) {
        throw new AppError("Authentication required", 401, ERROR_CODES.UNAUTHORIZED);
    }

    const payload = {
        ...req.body,
        business_id: req.user.business_id,
        created_by: req.user.id,
        idempotency_key: getIdempotencyKey(req),
    };

    const result = await createSaleInvoice(payload);
    return sendSuccess(res, {
        message: "Invoice created",
        data: result,
    });
};

export const createPurchaseInvoiceHandler = async (
    req: Request<{}, unknown, CreateSalesInvoiceBody>,
    res: Response
) => {
    if (!req.user?.id || !req.user.business_id) {
        throw new AppError("Authentication required", 401, ERROR_CODES.UNAUTHORIZED);
    }

    const payload = {
        ...req.body,
        business_id: req.user.business_id,
        created_by: req.user.id,
        idempotency_key: getIdempotencyKey(req),
    };

    const result = await createPurchaseInvoice(payload);
    return sendSuccess(res, {
        message: "Purchase invoice created",
        data: result,
    });
};

export const createInvoiceNoteHandler = async (
    req: Request<{ business_id: string; invoice_id: string }, unknown, CreateInvoiceNoteBody>,
    res: Response
) => {
    if (!req.user?.id || !req.user.business_id) {
        throw new AppError("Authentication required", 401, ERROR_CODES.UNAUTHORIZED);
    }

    const payload = {
        ...req.body,
        business_id: req.user.business_id,
        created_by: req.user.id,
        reference_invoice_id: req.params.invoice_id,
        idempotency_key: getIdempotencyKey(req),
    };

    const result = await createInvoiceNote(payload);
    const action = payload.note_type === "credit_note" ? "Credit note" : "Debit note";
    return sendSuccess(res, {
        message: `${action} created`,
        data: result,
    });
};



export const createPaymentHandler = async (req: Request<{}, unknown, RecordPaymentBody>, res: Response) => {
    if (!req.user?.id || !req.user.business_id) {
        throw new AppError("Authentication required", 401, ERROR_CODES.UNAUTHORIZED);
    }

    const payload = {
        ...req.body,
        business_id: req.user.business_id,
        createdBy: req.user.id,
        idempotency_key: getIdempotencyKey(req),
    };

    const result = await recordPayment(payload);
    return sendSuccess(res, {
        message: "Payment recorded",
        data: result,
    });
};
