import type { Request, Response } from "express";
import { ERROR_CODES } from "../constants/errorCodes";
import {
    getGstSummaryReport,
    getLowStockReport,
    getMonthlySalesReport,
    getOutstandingReport,
} from "../services/report.service";
import type {
    DateRangeExportQueryRaw,
    ExportFormat,
    GstSummaryExportQueryRaw,
    GstSummaryQueryRaw,
    ReportsParams,
    ReportExportQueryRaw,
} from "../types/report";
import { AppError } from "../utils/appError";
import { sendSuccess } from "../utils/responseHandler";
import { buildExportFilename, toCsvStream, toExcelBuffer } from "../utils/export";
import {
    dateRangeExportQuerySchema,
    dateRangeQuerySchema,
    exportFormatSchema,
    gstSummaryExportQuerySchema,
    gstSummaryQuerySchema,
} from "../validators/report.validator";

const getBusinessId = (req: Request<ReportsParams>): string => {
    const raw = req.params.business_id;
    const businessId = Array.isArray(raw) ? raw[0] : raw;
    if (!businessId) {
        throw new AppError("Business ID missing in route", 400, ERROR_CODES.BAD_REQUEST);
    }
    return businessId;
};

export const monthlySalesReportHandler = async (
    req: Request<ReportsParams>,
    res: Response
) => {
    const businessId = getBusinessId(req);
    const parsed = dateRangeQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        throw new AppError("Validation failed", 400, ERROR_CODES.VALIDATION_ERROR, parsed.error.issues);
    }

    const data = await getMonthlySalesReport({
        business_id: businessId,
        ...parsed.data,
    });

    return sendSuccess(res, {
        message: "Monthly sales report fetched",
        data,
    });
};

export const outstandingReportHandler = async (req: Request<ReportsParams>, res: Response) => {
    const businessId = getBusinessId(req);
    const data = await getOutstandingReport(businessId);

    return sendSuccess(res, {
        message: "Outstanding report fetched",
        data,
    });
};

export const gstSummaryReportHandler = async (
    req: Request<ReportsParams, unknown, unknown, GstSummaryQueryRaw>,
    res: Response
) => {
    const businessId = getBusinessId(req);
    const parsed = gstSummaryQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        throw new AppError("Validation failed", 400, ERROR_CODES.VALIDATION_ERROR, parsed.error.issues);
    }

    const data = await getGstSummaryReport({
        business_id: businessId,
        ...parsed.data,
    });

    return sendSuccess(res, {
        message: "GST summary report fetched",
        data,
    });
};

export const lowStockReportHandler = async (req: Request<ReportsParams>, res: Response) => {
    const businessId = getBusinessId(req);
    const data = await getLowStockReport(businessId);

    return sendSuccess(res, {
        message: "Low stock report fetched",
        data,
    });
};

const sendExport = async (
    res: Response,
    fileBaseName: string,
    worksheetName: string,
    rows: Record<string, unknown>[],
    format: ExportFormat
) => {
    const filename = buildExportFilename(fileBaseName, format);
    if (format === "csv") {
        const csvStream = toCsvStream(rows);
        res.status(200);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

        await new Promise<void>((resolve, reject) => {
            csvStream.on("error", reject);
            res.on("error", reject);
            res.on("finish", resolve);
            csvStream.pipe(res);
        });
        return;
    }

    const content = await toExcelBuffer(rows, worksheetName);
    return res
        .status(200)
        .setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        .setHeader("Content-Disposition", `attachment; filename="${filename}"`)
        .send(content);
};

export const exportMonthlySalesReportHandler = async (
    req: Request<ReportsParams, unknown, unknown, DateRangeExportQueryRaw>,
    res: Response
) => {
    const businessId = getBusinessId(req);
    const parsed = dateRangeExportQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        throw new AppError("Validation failed", 400, ERROR_CODES.VALIDATION_ERROR, parsed.error.issues);
    }

    const data = await getMonthlySalesReport({
        business_id: businessId,
        from_date: parsed.data.from_date,
        to_date: parsed.data.to_date,
    });

    return await sendExport(res, "monthly-sales-report", "Monthly Sales", data, parsed.data.format);
};

export const exportOutstandingReportHandler = async (
    req: Request<ReportsParams, unknown, unknown, ReportExportQueryRaw>,
    res: Response
) => {
    const businessId = getBusinessId(req);
    const parsed = exportFormatSchema.safeParse(req.query);
    if (!parsed.success) {
        throw new AppError("Validation failed", 400, ERROR_CODES.VALIDATION_ERROR, parsed.error.issues);
    }

    const data = await getOutstandingReport(businessId);
    const summary = data.summary as Record<string, unknown>;
    const parties = data.parties as Record<string, unknown>[];
    const rows = parties.length > 0
        ? parties.map((party) => ({
              ...party,
              total_receivable: summary.total_receivable,
              total_payable: summary.total_payable,
          }))
        : [summary];

    return await sendExport(res, "outstanding-report", "Outstanding", rows, parsed.data.format);
};

export const exportGstSummaryReportHandler = async (
    req: Request<ReportsParams, unknown, unknown, GstSummaryExportQueryRaw>,
    res: Response
) => {
    const businessId = getBusinessId(req);
    const parsed = gstSummaryExportQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        throw new AppError("Validation failed", 400, ERROR_CODES.VALIDATION_ERROR, parsed.error.issues);
    }

    const data = await getGstSummaryReport({
        business_id: businessId,
        from_date: parsed.data.from_date,
        to_date: parsed.data.to_date,
        invoice_type: parsed.data.invoice_type,
    });

    return await sendExport(
        res,
        "gst-summary-report",
        "GST Summary",
        [data as Record<string, unknown>],
        parsed.data.format
    );
};

export const exportLowStockReportHandler = async (
    req: Request<ReportsParams, unknown, unknown, ReportExportQueryRaw>,
    res: Response
) => {
    const businessId = getBusinessId(req);
    const parsed = exportFormatSchema.safeParse(req.query);
    if (!parsed.success) {
        throw new AppError("Validation failed", 400, ERROR_CODES.VALIDATION_ERROR, parsed.error.issues);
    }

    const data = await getLowStockReport(businessId);
    return await sendExport(
        res,
        "low-stock-report",
        "Low Stock",
        data as Record<string, unknown>[],
        parsed.data.format
    );
};
