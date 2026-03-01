import { Router } from "express";
import { authenticateToken } from "../middleware/jwt";
import { businessGuard } from "../middleware/businessGaurd";
import { asyncHandler } from "../middleware/asyncHandler";
import { authorizeRoles } from "../middleware/roleGuard";
import {
    getInvoiceSettingsHandler,
    updateInvoiceSettingsHandler,
    resetInvoiceSettingsHandler,
} from "../controller/invoice-settings.controller";

const invoiceSettingsRouter = Router();

invoiceSettingsRouter.use(authenticateToken);
invoiceSettingsRouter.use("/businesses/:business_id/invoice-settings", businessGuard);

const readRoles = authorizeRoles(["owner", "admin", "staff", "accountant", "viewer"]);
const writeRoles = authorizeRoles(["owner", "admin"]);

invoiceSettingsRouter.get(
    "/businesses/:business_id/invoice-settings",
    readRoles,
    asyncHandler(getInvoiceSettingsHandler)
);

invoiceSettingsRouter.put(
    "/businesses/:business_id/invoice-settings",
    writeRoles,
    asyncHandler(updateInvoiceSettingsHandler)
);

invoiceSettingsRouter.post(
    "/businesses/:business_id/invoice-settings/reset",
    writeRoles,
    asyncHandler(resetInvoiceSettingsHandler)
);

export default invoiceSettingsRouter;
