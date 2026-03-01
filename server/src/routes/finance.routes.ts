import { Router } from "express";
import {
    createPaymentHandler,
    createPurchaseInvoiceHandler,
    createInvoiceNoteHandler,
    createSalesInvoiceHandler,
} from "../controller/finance.controller";
import { asyncHandler } from "../middleware/asyncHandler";
import { businessGuard } from "../middleware/businessGaurd";
import { authenticateToken } from "../middleware/jwt";
import { authorizeRoles } from "../middleware/roleGuard";
import { validate } from "../middleware/validate";
import {
    createInvoiceSchema,
    createInvoiceNoteSchema,
    recordPaymentSchema,
} from "../validators/finance.validator";

const financeRouter = Router();

financeRouter.use(authenticateToken);

const writeRoles = authorizeRoles(["owner", "admin", "staff", "accountant"]);

financeRouter.post(
    "/invoices/sales",
    writeRoles,
    validate(createInvoiceSchema),
    asyncHandler(createSalesInvoiceHandler)
);

financeRouter.post(
    "/invoices/purchase",
    writeRoles,
    validate(createInvoiceSchema),
    asyncHandler(createPurchaseInvoiceHandler)
);

financeRouter.post(
    "/businesses/:business_id/invoices/:invoice_id/notes",
    businessGuard,
    writeRoles,
    validate(createInvoiceNoteSchema),
    asyncHandler(createInvoiceNoteHandler)
);

financeRouter.post(
    "/payments",
    writeRoles,
    validate(recordPaymentSchema),
    asyncHandler(createPaymentHandler)
);

export default financeRouter;
