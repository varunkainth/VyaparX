import { Router } from "express";
import {
    cancelInvoiceHandler,
    createInvoiceShareLinkHandler,
    downloadInvoicePdfHandler,
    downloadPublicInvoicePdfHandler,
    getInvoiceHandler,
    getPublicInvoiceHandler,
    listInvoicesHandler,
} from "../controller/invoice.controller";
import { asyncHandler } from "../middleware/asyncHandler";
import { businessGuard } from "../middleware/businessGaurd";
import { authenticateToken } from "../middleware/jwt";
import { authorizeRoles } from "../middleware/roleGuard";
import { validate } from "../middleware/validate";
import { cancelInvoiceSchema } from "../validators/invoice.validator";

const invoiceRouter = Router();

invoiceRouter.get("/public/invoices/:invoice_id", asyncHandler(getPublicInvoiceHandler));
invoiceRouter.get("/public/invoices/:invoice_id/pdf", asyncHandler(downloadPublicInvoicePdfHandler));

invoiceRouter.use(authenticateToken);
invoiceRouter.use("/businesses/:business_id/invoices", businessGuard);

invoiceRouter.get(
    "/businesses/:business_id/invoices",
    authorizeRoles(["owner", "admin", "staff", "accountant", "viewer"]),
    asyncHandler(listInvoicesHandler)
);

invoiceRouter.get(
    "/businesses/:business_id/invoices/:invoice_id",
    authorizeRoles(["owner", "admin", "staff", "accountant", "viewer"]),
    asyncHandler(getInvoiceHandler)
);

invoiceRouter.get(
    "/businesses/:business_id/invoices/:invoice_id/pdf",
    authorizeRoles(["owner", "admin", "staff", "accountant", "viewer"]),
    asyncHandler(downloadInvoicePdfHandler)
);

invoiceRouter.post(
    "/businesses/:business_id/invoices/:invoice_id/share",
    authorizeRoles(["owner", "admin", "staff", "accountant", "viewer"]),
    asyncHandler(createInvoiceShareLinkHandler)
);

invoiceRouter.post(
    "/businesses/:business_id/invoices/:invoice_id/cancel",
    authorizeRoles(["owner", "admin", "accountant"]),
    validate(cancelInvoiceSchema),
    asyncHandler(cancelInvoiceHandler)
);

export default invoiceRouter;
