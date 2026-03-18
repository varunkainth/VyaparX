import { Router } from "express";
import {
    downloadPublicInvoicePdfHandler,
    getPublicInvoiceHandler,
} from "../controller/invoice.controller";
import { asyncHandler } from "../middleware/asyncHandler";

const publicInvoiceRouter = Router();

publicInvoiceRouter.get("/public/invoices/:invoice_id", asyncHandler(getPublicInvoiceHandler));
publicInvoiceRouter.get("/public/invoices/:invoice_id/pdf", asyncHandler(downloadPublicInvoicePdfHandler));

export default publicInvoiceRouter;
