import type { Request, Response } from "express";
import { ERROR_CODES } from "../constants/errorCodes";
import { getLedgerStatement } from "../services/ledger.service";
import type { LedgerParams } from "../types/ledger";
import { AppError } from "../utils/appError";
import { sendSuccess } from "../utils/responseHandler";
import { ledgerStatementQuerySchema } from "../validators/ledger.validator";

const getBusinessId = (req: Request<LedgerParams>): string => {
    const raw = req.params.business_id;
    const businessId = Array.isArray(raw) ? raw[0] : raw;
    if (!businessId) {
        throw new AppError("Business ID missing in route", 400, ERROR_CODES.BAD_REQUEST);
    }
    return businessId;
};

export const getLedgerStatementHandler = async (
    req: Request<LedgerParams>,
    res: Response
) => {
    const businessId = getBusinessId(req);

    const parsed = ledgerStatementQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        throw new AppError("Validation failed", 400, ERROR_CODES.VALIDATION_ERROR, parsed.error.issues);
    }

    const statement = await getLedgerStatement({
        business_id: businessId,
        ...parsed.data,
    });

    return sendSuccess(res, {
        message: "Ledger statement fetched",
        data: statement,
    });
};
