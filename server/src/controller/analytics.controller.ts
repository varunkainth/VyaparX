import type { Request, Response } from "express";
import { ERROR_CODES } from "../constants/errorCodes";
import {
    fetchAnalyticsOverview,
    fetchAnalyticsRollups,
    fetchRecentAnalyticsEvents,
} from "../services/analytics.service";
import { AppError } from "../utils/appError";
import { sendSuccess } from "../utils/responseHandler";

const getBusinessId = (req: Request<{ business_id: string }>): string => {
    const raw = req.params.business_id;
    const businessId = Array.isArray(raw) ? raw[0] : raw;
    if (!businessId) {
        throw new AppError("Business ID missing in route", 400, ERROR_CODES.BAD_REQUEST);
    }
    return businessId;
};

export const analyticsOverviewHandler = async (req: Request<{ business_id: string }>, res: Response) => {
    const businessId = getBusinessId(req);
    const sinceHoursRaw = Number(req.query.since_hours ?? 24);
    const sinceHours = Number.isNaN(sinceHoursRaw) ? 24 : sinceHoursRaw;
    const durationMs = Math.max(sinceHours, 1) * 60 * 60 * 1000;

    const overview = await fetchAnalyticsOverview(businessId, durationMs);
    return sendSuccess(res, {
        message: "Analytics overview fetched",
        data: overview,
    });
};

export const analyticsEventsHandler = async (req: Request<{ business_id: string }>, res: Response) => {
    const businessId = getBusinessId(req);
    const limitRaw = Number(req.query.limit ?? 20);
    const limit = Number.isNaN(limitRaw) ? 20 : limitRaw;
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    const events = await fetchRecentAnalyticsEvents(businessId, safeLimit);
    return sendSuccess(res, {
        message: "Recent analytics events fetched",
        data: { items: events },
    });
};

export const analyticsRollupsHandler = async (req: Request<{ business_id: string }>, res: Response) => {
    const businessId = getBusinessId(req);
    const fromDate = typeof req.query.from_date === "string" ? req.query.from_date : undefined;
    const toDate = typeof req.query.to_date === "string" ? req.query.to_date : undefined;

    const items = await fetchAnalyticsRollups({
        business_id: businessId,
        from_date: fromDate,
        to_date: toDate,
    });

    return sendSuccess(res, {
        message: "Analytics rollups fetched",
        data: { items },
    });
};
