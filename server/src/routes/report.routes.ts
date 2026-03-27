import { Router } from "express";
import {
    exportGstSummaryReportHandler,
    exportLowStockReportHandler,
    exportMonthlySalesReportHandler,
    exportOutstandingReportHandler,
    exportProfitLossReportHandler,
    exportPurchaseReportHandler,
    gstSummaryReportHandler,
    lowStockReportHandler,
    monthlySalesReportHandler,
    outstandingReportHandler,
    profitLossReportHandler,
    purchaseReportHandler,
} from "../controller/report.controller";
import { asyncHandler } from "../middleware/asyncHandler";
import { businessGuard } from "../middleware/businessGaurd";
import { authenticateToken } from "../middleware/jwt";
import { authorizeRoles } from "../middleware/roleGuard";

const reportRouter = Router();

reportRouter.use(authenticateToken);
reportRouter.use("/businesses/:business_id/reports", businessGuard);

const readRoles = authorizeRoles(["owner", "admin", "staff", "accountant", "viewer"]);

reportRouter.get(
    "/businesses/:business_id/reports/monthly-sales",
    readRoles,
    asyncHandler(monthlySalesReportHandler)
);

reportRouter.get(
    "/businesses/:business_id/reports/outstanding",
    readRoles,
    asyncHandler(outstandingReportHandler)
);

reportRouter.get(
    "/businesses/:business_id/reports/gst-summary",
    readRoles,
    asyncHandler(gstSummaryReportHandler)
);

reportRouter.get(
    "/businesses/:business_id/reports/low-stock",
    readRoles,
    asyncHandler(lowStockReportHandler)
);

reportRouter.get(
    "/businesses/:business_id/reports/purchase",
    readRoles,
    asyncHandler(purchaseReportHandler)
);

reportRouter.get(
    "/businesses/:business_id/reports/profit-loss",
    readRoles,
    asyncHandler(profitLossReportHandler)
);

reportRouter.get(
    "/businesses/:business_id/reports/monthly-sales/export",
    readRoles,
    asyncHandler(exportMonthlySalesReportHandler)
);

reportRouter.get(
    "/businesses/:business_id/reports/outstanding/export",
    readRoles,
    asyncHandler(exportOutstandingReportHandler)
);

reportRouter.get(
    "/businesses/:business_id/reports/gst-summary/export",
    readRoles,
    asyncHandler(exportGstSummaryReportHandler)
);

reportRouter.get(
    "/businesses/:business_id/reports/low-stock/export",
    readRoles,
    asyncHandler(exportLowStockReportHandler)
);

reportRouter.get(
    "/businesses/:business_id/reports/purchase/export",
    readRoles,
    asyncHandler(exportPurchaseReportHandler)
);

reportRouter.get(
    "/businesses/:business_id/reports/profit-loss/export",
    readRoles,
    asyncHandler(exportProfitLossReportHandler)
);

export default reportRouter;
