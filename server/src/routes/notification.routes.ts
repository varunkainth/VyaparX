import { Router } from "express";
import {
    clearNotificationHandler,
    listNotificationsHandler,
    markAllNotificationsAsReadHandler,
    markNotificationAsReadHandler,
} from "../controller/notification.controller";
import { asyncHandler } from "../middleware/asyncHandler";
import { businessGuard } from "../middleware/businessGaurd";
import { authenticateToken } from "../middleware/jwt";
import { authorizeRoles } from "../middleware/roleGuard";

const notificationRouter = Router();

notificationRouter.use(authenticateToken);
notificationRouter.use("/businesses/:business_id/notifications", businessGuard);

notificationRouter.get(
    "/businesses/:business_id/notifications",
    authorizeRoles(["owner", "admin", "staff", "accountant", "viewer"]),
    asyncHandler(listNotificationsHandler)
);

notificationRouter.post(
    "/businesses/:business_id/notifications/read-all",
    authorizeRoles(["owner", "admin", "staff", "accountant", "viewer"]),
    asyncHandler(markAllNotificationsAsReadHandler)
);

notificationRouter.post(
    "/businesses/:business_id/notifications/:notification_id/read",
    authorizeRoles(["owner", "admin", "staff", "accountant", "viewer"]),
    asyncHandler(markNotificationAsReadHandler)
);

notificationRouter.delete(
    "/businesses/:business_id/notifications/:notification_id",
    authorizeRoles(["owner", "admin", "staff", "accountant", "viewer"]),
    asyncHandler(clearNotificationHandler)
);

export default notificationRouter;
