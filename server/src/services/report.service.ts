import { reportRepository } from "../repository/report.repository";

export async function getMonthlySalesReport(args: {
    business_id: string;
    from_date?: string;
    to_date?: string;
}) {
    return reportRepository.getMonthlySales({
        businessId: args.business_id,
        fromDate: args.from_date,
        toDate: args.to_date,
    });
}

export async function getOutstandingReport(businessId: string) {
    return reportRepository.getOutstandingSummary(businessId);
}

export async function getGstSummaryReport(args: {
    business_id: string;
    from_date?: string;
    to_date?: string;
    invoice_type?: "sales" | "purchase" | "credit_note" | "debit_note";
}) {
    return reportRepository.getGstSummary({
        businessId: args.business_id,
        fromDate: args.from_date,
        toDate: args.to_date,
        invoiceType: args.invoice_type,
    });
}

export async function getPurchaseReport(args: {
    business_id: string;
    from_date?: string;
    to_date?: string;
}) {
    return reportRepository.getPurchaseSummary({
        businessId: args.business_id,
        fromDate: args.from_date,
        toDate: args.to_date,
    });
}

export async function getProfitLossReport(args: {
    business_id: string;
    from_date?: string;
    to_date?: string;
}) {
    return reportRepository.getProfitLoss({
        businessId: args.business_id,
        fromDate: args.from_date,
        toDate: args.to_date,
    });
}

export async function getLowStockReport(businessId: string) {
    return reportRepository.getLowStock(businessId);
}
