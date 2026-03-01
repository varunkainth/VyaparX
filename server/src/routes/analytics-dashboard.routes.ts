import { Router } from "express";
import { authenticateToken } from "../middleware/jwt";
import { businessGuard } from "../middleware/businessGaurd";
import { asyncHandler } from "../middleware/asyncHandler";
import { authorizeRoles } from "../middleware/roleGuard";
import { analyticsHandler, activityHandler } from "../controller/analytics-dashboard.controller";

const analyticsDashboardRouter = Router();

analyticsDashboardRouter.use(authenticateToken);
analyticsDashboardRouter.use("/businesses/:business_id/analytics", businessGuard);
analyticsDashboardRouter.use("/businesses/:business_id/activity", businessGuard);

const readRoles = authorizeRoles(["owner", "admin", "staff", "accountant", "viewer"]);

analyticsDashboardRouter.get(
    "/businesses/:business_id/analytics",
    readRoles,
    asyncHandler(analyticsHandler)
);

analyticsDashboardRouter.get(
    "/businesses/:business_id/activity",
    readRoles,
    asyncHandler(activityHandler)
);

export default analyticsDashboardRouter;
