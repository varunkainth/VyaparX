import pool from "../config/db";
import type {
    DashboardStats,
    RecentInvoice,
    RecentPayment,
    LowStockItem,
} from "../types/dashboard";

export const dashboardRepository = {
    async getStats(businessId: string): Promise<DashboardStats> {
        const client = await pool.connect();
        try {
            // Get current month start date
            const currentMonthStart = new Date();
            currentMonthStart.setDate(1);
            currentMonthStart.setHours(0, 0, 0, 0);

            // Get last month start and end dates
            const lastMonthStart = new Date(currentMonthStart);
            lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
            const lastMonthEnd = new Date(currentMonthStart);
            lastMonthEnd.setMilliseconds(-1);

            // Revenue stats
            const revenueQuery = `
                SELECT 
                    COALESCE(SUM(CASE WHEN invoice_type = 'sales' AND is_cancelled = false THEN grand_total ELSE 0 END), 0) as sales,
                    COALESCE(SUM(CASE WHEN invoice_type = 'purchase' AND is_cancelled = false THEN grand_total ELSE 0 END), 0) as purchases,
                    COALESCE(SUM(CASE WHEN invoice_type = 'sales' AND is_cancelled = false THEN grand_total ELSE 0 END), 0) - 
                    COALESCE(SUM(CASE WHEN invoice_type = 'purchase' AND is_cancelled = false THEN grand_total ELSE 0 END), 0) as total
                FROM invoices
                WHERE business_id = $1 AND invoice_date >= $2
            `;
            const currentRevenue = await client.query(revenueQuery, [businessId, currentMonthStart]);
            const lastRevenue = await client.query(revenueQuery, [businessId, lastMonthStart]);

            const currentTotal = parseFloat(currentRevenue.rows[0].total) || 0;
            const lastTotal = parseFloat(lastRevenue.rows[0].total) || 0;
            const growthPercentage = lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 0;

            // Invoice stats
            const invoiceQuery = `
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN invoice_type = 'sales' THEN 1 END) as sales,
                    COUNT(CASE WHEN invoice_type = 'purchase' THEN 1 END) as purchases,
                    COUNT(CASE WHEN payment_status = 'unpaid' THEN 1 END) as unpaid,
                    COUNT(CASE WHEN payment_status = 'overdue' THEN 1 END) as overdue
                FROM invoices
                WHERE business_id = $1 AND is_cancelled = false
            `;
            const invoiceStats = await client.query(invoiceQuery, [businessId]);

            // Payment stats
            const paymentQuery = `
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN payment_type = 'received' THEN 1 END) as received,
                    COUNT(CASE WHEN payment_type = 'made' THEN 1 END) as made,
                    COUNT(CASE WHEN is_reconciled = false THEN 1 END) as unreconciled
                FROM payments
                WHERE business_id = $1
            `;
            const paymentStats = await client.query(paymentQuery, [businessId]);

            // Party stats
            const partyQuery = `
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN party_type = 'customer' THEN 1 END) as customers,
                    COUNT(CASE WHEN party_type = 'supplier' THEN 1 END) as suppliers,
                    COUNT(CASE WHEN party_type = 'both' THEN 1 END) as both,
                    COUNT(CASE WHEN is_active = true THEN 1 END) as active
                FROM parties
                WHERE business_id = $1
            `;
            const partyStats = await client.query(partyQuery, [businessId]);

            // Inventory stats
            const inventoryQuery = `
                SELECT 
                    COUNT(*) as total_items,
                    COUNT(CASE WHEN current_stock < low_stock_threshold THEN 1 END) as low_stock_items,
                    COALESCE(SUM(current_stock * selling_price), 0) as total_value,
                    COUNT(CASE WHEN is_active = true THEN 1 END) as active_items
                FROM inventory_items
                WHERE business_id = $1
            `;
            const inventoryStats = await client.query(inventoryQuery, [businessId]);

            return {
                revenue: {
                    total: currentTotal,
                    sales: parseFloat(currentRevenue.rows[0].sales) || 0,
                    purchases: parseFloat(currentRevenue.rows[0].purchases) || 0,
                    growth_percentage: growthPercentage,
                },
                invoices: {
                    total: parseInt(invoiceStats.rows[0].total) || 0,
                    sales: parseInt(invoiceStats.rows[0].sales) || 0,
                    purchases: parseInt(invoiceStats.rows[0].purchases) || 0,
                    unpaid: parseInt(invoiceStats.rows[0].unpaid) || 0,
                    overdue: parseInt(invoiceStats.rows[0].overdue) || 0,
                },
                payments: {
                    total: parseInt(paymentStats.rows[0].total) || 0,
                    received: parseInt(paymentStats.rows[0].received) || 0,
                    made: parseInt(paymentStats.rows[0].made) || 0,
                    unreconciled: parseInt(paymentStats.rows[0].unreconciled) || 0,
                },
                parties: {
                    total: parseInt(partyStats.rows[0].total) || 0,
                    customers: parseInt(partyStats.rows[0].customers) + parseInt(partyStats.rows[0].both) || 0,
                    suppliers: parseInt(partyStats.rows[0].suppliers) + parseInt(partyStats.rows[0].both) || 0,
                    active: parseInt(partyStats.rows[0].active) || 0,
                },
                inventory: {
                    total_items: parseInt(inventoryStats.rows[0].total_items) || 0,
                    low_stock_items: parseInt(inventoryStats.rows[0].low_stock_items) || 0,
                    total_value: parseFloat(inventoryStats.rows[0].total_value) || 0,
                    active_items: parseInt(inventoryStats.rows[0].active_items) || 0,
                },
            };
        } finally {
            client.release();
        }
    },

    async getRecentInvoices(businessId: string, limit: number = 5): Promise<RecentInvoice[]> {
        const query = `
            SELECT 
                i.id,
                i.invoice_number,
                i.invoice_type,
                p.name as party_name,
                i.round_off,
                i.grand_total,
                i.payment_status,
                i.invoice_date
            FROM invoices i
            JOIN parties p ON i.party_id = p.id
            WHERE i.business_id = $1 AND i.is_cancelled = false
            ORDER BY i.created_at DESC
            LIMIT $2
        `;
        const result = await pool.query(query, [businessId, limit]);
        return result.rows;
    },

    async getRecentPayments(businessId: string, limit: number = 5): Promise<RecentPayment[]> {
        const query = `
            SELECT 
                pm.id,
                p.name as party_name,
                pm.payment_type,
                pm.amount,
                pm.payment_date,
                pm.payment_mode
            FROM payments pm
            JOIN parties p ON pm.party_id = p.id
            WHERE pm.business_id = $1
            ORDER BY pm.created_at DESC
            LIMIT $2
        `;
        const result = await pool.query(query, [businessId, limit]);
        return result.rows;
    },

    async getLowStockItems(businessId: string, limit: number = 10): Promise<LowStockItem[]> {
        const query = `
            SELECT 
                id,
                name,
                current_stock,
                low_stock_threshold,
                unit
            FROM inventory_items
            WHERE business_id = $1 
                AND is_active = true 
                AND current_stock < low_stock_threshold
            ORDER BY (current_stock / NULLIF(low_stock_threshold, 0)) ASC
            LIMIT $2
        `;
        const result = await pool.query(query, [businessId, limit]);
        return result.rows;
    },
};
