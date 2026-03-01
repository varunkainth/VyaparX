import { dashboardRepository } from "../repository/dashboard.repository";
import type { DashboardData } from "../types/dashboard";

export async function getDashboardData(businessId: string): Promise<DashboardData> {
    const [stats, recent_invoices, recent_payments, low_stock_items] = await Promise.all([
        dashboardRepository.getStats(businessId),
        dashboardRepository.getRecentInvoices(businessId, 5),
        dashboardRepository.getRecentPayments(businessId, 5),
        dashboardRepository.getLowStockItems(businessId, 10),
    ]);

    return {
        stats,
        recent_invoices,
        recent_payments,
        low_stock_items,
    };
}
