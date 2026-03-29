import type { Request, Response } from "express";
import {
    buildDashboardCacheKey,
    cacheTtlSeconds,
    getOrSetCache,
} from "../services/cache.service";
import { getDashboardData } from "../services/dashboard.service";
import { sendSuccess } from "../utils/responseHandler";

export async function dashboardHandler(req: Request<{ business_id: string }>, res: Response) {
    const { business_id } = req.params;

    const cacheKey = await buildDashboardCacheKey(business_id);
    const data = await getOrSetCache(cacheKey, cacheTtlSeconds.dashboard, () =>
        getDashboardData(business_id)
    );

    sendSuccess(res, {
        message: "Dashboard data fetched successfully",
        data,
    });
}
