import type { Request, Response } from "express";
import { ERROR_CODES } from "../constants/errorCodes";
import {
    getPaymentById,
    listPayments,
    reconcilePayment,
    unreconcilePayment,
} from "../services/payment.service";
import { logAuditEvent } from "../services/audit.service";
import type { PaymentParams, ReconcilePaymentBody } from "../types/payment";
import { AppError } from "../utils/appError";
import { sendSuccess } from "../utils/responseHandler";
import { listPaymentsQuerySchema } from "../validators/payment.validator";

const getBusinessId = (req: Request<{ business_id: string }>): string => {
    const raw = req.params.business_id;
    const businessId = Array.isArray(raw) ? raw[0] : raw;
    if (!businessId) {
        throw new AppError("Business ID missing in route", 400, ERROR_CODES.BAD_REQUEST);
    }
    return businessId;
};

const getPaymentId = (req: Request<PaymentParams>): string => {
    const raw = req.params.payment_id;
    const paymentId = Array.isArray(raw) ? raw[0] : raw;
    if (!paymentId) {
        throw new AppError("Payment ID missing in route", 400, ERROR_CODES.BAD_REQUEST);
    }
    return paymentId;
};

export const listPaymentsHandler = async (
    req: Request<{ business_id: string }>,
    res: Response
) => {
    const businessId = getBusinessId(req);
    const parsed = listPaymentsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        throw new AppError("Validation failed", 400, ERROR_CODES.VALIDATION_ERROR, parsed.error.issues);
    }

    const result = await listPayments({
        business_id: businessId,
        ...parsed.data,
    });

    return sendSuccess(res, {
        message: "Payments fetched",
        data: result,
    });
};

export const getPaymentHandler = async (req: Request<PaymentParams>, res: Response) => {
    const businessId = getBusinessId(req);
    const paymentId = getPaymentId(req);

    const payment = await getPaymentById(businessId, paymentId);
    return sendSuccess(res, {
        message: "Payment fetched",
        data: payment,
    });
};

export const reconcilePaymentHandler = async (
    req: Request<PaymentParams, unknown, ReconcilePaymentBody>,
    res: Response
) => {
    if (!req.user?.id) {
        throw new AppError("Authentication required", 401, ERROR_CODES.UNAUTHORIZED);
    }

    const businessId = getBusinessId(req);
    const paymentId = getPaymentId(req);
    const { bank_statement_date, bank_ref_no, notes } = req.body;

    const payment = await reconcilePayment({
        business_id: businessId,
        payment_id: paymentId,
        reconciled_by: req.user.id,
        bank_statement_date,
        bank_ref_no,
        notes,
    });

    await logAuditEvent({
        business_id: businessId,
        actor_user_id: req.user.id,
        action: "payment_reconciled",
        entity_type: "payment",
        entity_id: paymentId,
        metadata: { bank_statement_date, bank_ref_no: bank_ref_no ?? null },
    });

    return sendSuccess(res, {
        message: "Payment reconciled",
        data: payment,
    });
};

export const unreconcilePaymentHandler = async (req: Request<PaymentParams>, res: Response) => {
    if (!req.user?.id) {
        throw new AppError("Authentication required", 401, ERROR_CODES.UNAUTHORIZED);
    }

    const businessId = getBusinessId(req);
    const paymentId = getPaymentId(req);

    const payment = await unreconcilePayment({
        business_id: businessId,
        payment_id: paymentId,
        requested_by: req.user.id,
    });

    await logAuditEvent({
        business_id: businessId,
        actor_user_id: req.user.id,
        action: "payment_unreconciled",
        entity_type: "payment",
        entity_id: paymentId,
    });

    return sendSuccess(res, {
        message: "Payment unreconciled",
        data: payment,
    });
};
