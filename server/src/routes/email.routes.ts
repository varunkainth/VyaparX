import { Router } from "express";
import { sendInvoiceEmailHandler, testEmailConfigHandler } from "../controller/email.controller";
import { asyncHandler } from "../middleware/asyncHandler";
import { businessGuard } from "../middleware/businessGaurd";
import { authenticateToken } from "../middleware/jwt";
import { authorizeRoles } from "../middleware/roleGuard";
import { validate } from "../middleware/validate";
import { sendInvoiceEmailSchema, testEmailSchema } from "../validators/email.validator";

const emailRouter = Router();

emailRouter.use(authenticateToken);

const writeRoles = authorizeRoles(["owner", "admin", "staff", "accountant"]);

// Send invoice via email
emailRouter.post(
    "/businesses/:business_id/invoices/:invoice_id/email",
    businessGuard,
    writeRoles,
    validate(sendInvoiceEmailSchema),
    asyncHandler(sendInvoiceEmailHandler)
);

// Test email configuration
emailRouter.post(
    "/email/test",
    authorizeRoles(["owner", "admin"]),
    validate(testEmailSchema),
    asyncHandler(testEmailConfigHandler)
);

export default emailRouter;
