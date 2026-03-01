import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { businessGuard } from "../middleware/businessGaurd";
import { authenticateToken } from "../middleware/jwt";
import { authorizeRoles } from "../middleware/roleGuard";
import {
    analyticsEventsHandler,
    analyticsOverviewHandler,
    analyticsRollupsHandler,
} from "../controller/analytics.controller";

const analyticsRouter = Router();

analyticsRouter.use(authenticateToken);
analyticsRouter.use("/businesses/:business_id/analytics", businessGuard);

const readRoles = authorizeRoles(["owner", "admin", "staff", "accountant", "viewer"]);

analyticsRouter.get(
    "/businesses/:business_id/analytics/overview",
    readRoles,
    asyncHandler(analyticsOverviewHandler)
);

analyticsRouter.get(
    "/businesses/:business_id/analytics/events",
    readRoles,
    asyncHandler(analyticsEventsHandler)
);

analyticsRouter.get(
    "/businesses/:business_id/analytics/rollups",
    readRoles,
    asyncHandler(analyticsRollupsHandler)
);

export default analyticsRouter;
