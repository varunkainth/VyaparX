import type { Request, Response } from "express";
import { getAnalytics, getActivity } from "../services/analytics-dashboard.service";
import { sendSuccess } from "../utils/responseHandler";

export async function analyticsHandler(req: Request, res: Response) {
    const { business_id } = req.params;
    const days = parseInt(req.query.days as string) || 30;

    const data = await getAnalytics(business_id, days);

    sendSuccess(res, {
        message: "Analytics data fetched successfully",
        data,
    });
}

export async function activityHandler(req: Request, res: Response) {
    const { business_id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const data = await getActivity(business_id, page, limit);

    sendSuccess(res, {
        message: "Activity data fetched successfully",
        data,
    });
}
