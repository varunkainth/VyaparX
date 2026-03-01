import { Router } from "express";
import { authenticateToken } from "../middleware/jwt";
import { businessGuard } from "../middleware/businessGaurd";
import { asyncHandler } from "../middleware/asyncHandler";
import { authorizeRoles } from "../middleware/roleGuard";
import { dashboardHandler } from "../controller/dashboard.controller";

const dashboardRouter = Router();

dashboardRouter.use(authenticateToken);
dashboardRouter.use("/businesses/:business_id/dashboard", businessGuard);

const readRoles = authorizeRoles(["owner", "admin", "staff", "accountant", "viewer"]);

dashboardRouter.get(
    "/businesses/:business_id/dashboard",
    readRoles,
    asyncHandler(dashboardHandler)
);

export default dashboardRouter;
