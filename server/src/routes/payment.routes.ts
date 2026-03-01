import { Router } from "express";
import {
    getPaymentHandler,
    listPaymentsHandler,
    reconcilePaymentHandler,
    unreconcilePaymentHandler,
} from "../controller/payment.controller";
import { asyncHandler } from "../middleware/asyncHandler";
import { businessGuard } from "../middleware/businessGaurd";
import { authenticateToken } from "../middleware/jwt";
import { authorizeRoles } from "../middleware/roleGuard";
import { validate } from "../middleware/validate";
import { reconcilePaymentSchema } from "../validators/payment.validator";

const paymentRouter = Router();

paymentRouter.use(authenticateToken);
paymentRouter.use("/businesses/:business_id/payments", businessGuard);

paymentRouter.get(
    "/businesses/:business_id/payments",
    authorizeRoles(["owner", "admin", "staff", "accountant", "viewer"]),
    asyncHandler(listPaymentsHandler)
);

paymentRouter.get(
    "/businesses/:business_id/payments/:payment_id",
    authorizeRoles(["owner", "admin", "staff", "accountant", "viewer"]),
    asyncHandler(getPaymentHandler)
);

paymentRouter.post(
    "/businesses/:business_id/payments/:payment_id/reconcile",
    authorizeRoles(["owner", "admin", "accountant"]),
    validate(reconcilePaymentSchema),
    asyncHandler(reconcilePaymentHandler)
);

paymentRouter.post(
    "/businesses/:business_id/payments/:payment_id/unreconcile",
    authorizeRoles(["owner", "admin", "accountant"]),
    asyncHandler(unreconcilePaymentHandler)
);

export default paymentRouter;
