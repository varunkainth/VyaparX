import { Router } from "express";
import { pullSyncHandler, pushSyncHandler } from "../controller/sync.controller";
import { asyncHandler } from "../middleware/asyncHandler";
import { businessGuard } from "../middleware/businessGaurd";
import { authenticateToken } from "../middleware/jwt";
import { authorizeRoles } from "../middleware/roleGuard";
import { validate } from "../middleware/validate";
import { syncPushSchema } from "../validators/sync.validator";

const syncRouter = Router();

syncRouter.use(authenticateToken);
syncRouter.use("/sync/push", businessGuard);
syncRouter.use("/sync/pull", businessGuard);

syncRouter.post(
    "/sync/push",
    authorizeRoles(["owner", "admin", "staff", "accountant"]),
    validate(syncPushSchema),
    asyncHandler(pushSyncHandler)
);

syncRouter.get(
    "/sync/pull",
    authorizeRoles(["owner", "admin", "staff", "accountant", "viewer"]),
    asyncHandler(pullSyncHandler)
);

export default syncRouter;

