import type { Request, Response } from "express";
import { getDashboardData } from "../services/dashboard.service";
import { sendSuccess } from "../utils/responseHandler";

export async function dashboardHandler(req: Request, res: Response) {
    const { business_id } = req.params;

    const data = await getDashboardData(business_id);

    sendSuccess(res, {
        message: "Dashboard data fetched successfully",
        data,
    });
}
