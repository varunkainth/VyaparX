import pool from "../config/db";

export interface AnalyticsTimeSeriesData {
    date: string;
    sales: number;
    purchases: number;
    profit: number;
}

export interface AnalyticsCategoryData {
    category: string;
    value: number;
    percentage: number;
}

export interface AnalyticsTopItem {
    id: string;
    name: string;
    quantity: number;
    revenue: number;
}

export interface AnalyticsTopParty {
    id: string;
    name: string;
    party_type: "customer" | "supplier" | "both";
    total_amount: number;
    invoice_count: number;
}

export interface AnalyticsData {
    time_series: AnalyticsTimeSeriesData[];
    payment_modes: AnalyticsCategoryData[];
    top_selling_items: AnalyticsTopItem[];
    top_customers: AnalyticsTopParty[];
    top_suppliers: AnalyticsTopParty[];
    monthly_comparison: {
        current_month: {
            sales: number;
            purchases: number;
            profit: number;
        };
        last_month: {
            sales: number;
            purchases: number;
            profit: number;
        };
    };
}

export interface ActivityEvent {
    id: string;
    event_type: string;
    description: string;
    user_name: string | null;
    metadata: Record<string, any>;
    created_at: string;
}

export const analyticsDashboardRepository = {
    async getAnalytics(businessId: string, days: number): Promise<AnalyticsData> {
        const client = await pool.connect();
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            // Time series data
            const timeSeriesQuery = `
                SELECT 
                    DATE(invoice_date) as date,
                    COALESCE(SUM(CASE WHEN invoice_type = 'sales' AND is_cancelled = false THEN grand_total ELSE 0 END), 0) as sales,
                    COALESCE(SUM(CASE WHEN invoice_type = 'purchase' AND is_cancelled = false THEN grand_total ELSE 0 END), 0) as purchases,
                    COALESCE(SUM(CASE WHEN invoice_type = 'sales' AND is_cancelled = false THEN grand_total ELSE 0 END), 0) - 
                    COALESCE(SUM(CASE WHEN invoice_type = 'purchase' AND is_cancelled = false THEN grand_total ELSE 0 END), 0) as profit
                FROM invoices
                WHERE business_id = $1 AND invoice_date >= $2
                GROUP BY DATE(invoice_date)
                ORDER BY DATE(invoice_date) ASC
            `;
            const timeSeries = await client.query(timeSeriesQuery, [businessId, startDate]);

            // Payment modes distribution
            const paymentModesQuery = `
                SELECT 
                    payment_mode as category,
                    SUM(amount) as value
                FROM payments
                WHERE business_id = $1 AND payment_date >= $2
                GROUP BY payment_mode
            `;
            const paymentModes = await client.query(paymentModesQuery, [businessId, startDate]);
            const totalPayments = paymentModes.rows.reduce((sum, row) => sum + parseFloat(row.value), 0);
            const paymentModesWithPercentage = paymentModes.rows.map(row => ({
                category: row.category,
                value: parseFloat(row.value),
                percentage: totalPayments > 0 ? (parseFloat(row.value) / totalPayments) * 100 : 0,
            }));

            // Top selling items
            const topItemsQuery = `
                SELECT 
                    ii.item_id as id,
                    ii.item_name as name,
                    SUM(ii.quantity) as quantity,
                    SUM(ii.total_amount) as revenue
                FROM invoice_items ii
                JOIN invoices i ON ii.invoice_id = i.id
                WHERE i.business_id = $1 
                    AND i.invoice_type = 'sales' 
                    AND i.is_cancelled = false
                    AND i.invoice_date >= $2
                    AND ii.item_id IS NOT NULL
                GROUP BY ii.item_id, ii.item_name
                ORDER BY SUM(ii.total_amount) DESC
                LIMIT 5
            `;
            const topItems = await client.query(topItemsQuery, [businessId, startDate]);

            // Top customers
            const topCustomersQuery = `
                SELECT 
                    p.id,
                    p.name,
                    p.party_type,
                    SUM(i.grand_total) as total_amount,
                    COUNT(i.id) as invoice_count
                FROM parties p
                JOIN invoices i ON p.id = i.party_id
                WHERE i.business_id = $1 
                    AND i.invoice_type = 'sales'
                    AND i.is_cancelled = false
                    AND i.invoice_date >= $2
                    AND (p.party_type = 'customer' OR p.party_type = 'both')
                GROUP BY p.id, p.name, p.party_type
                ORDER BY SUM(i.grand_total) DESC
                LIMIT 5
            `;
            const topCustomers = await client.query(topCustomersQuery, [businessId, startDate]);

            // Top suppliers
            const topSuppliersQuery = `
                SELECT 
                    p.id,
                    p.name,
                    p.party_type,
                    SUM(i.grand_total) as total_amount,
                    COUNT(i.id) as invoice_count
                FROM parties p
                JOIN invoices i ON p.id = i.party_id
                WHERE i.business_id = $1 
                    AND i.invoice_type = 'purchase'
                    AND i.is_cancelled = false
                    AND i.invoice_date >= $2
                    AND (p.party_type = 'supplier' OR p.party_type = 'both')
                GROUP BY p.id, p.name, p.party_type
                ORDER BY SUM(i.grand_total) DESC
                LIMIT 5
            `;
            const topSuppliers = await client.query(topSuppliersQuery, [businessId, startDate]);

            // Monthly comparison
            const currentMonthStart = new Date();
            currentMonthStart.setDate(1);
            currentMonthStart.setHours(0, 0, 0, 0);

            const lastMonthStart = new Date(currentMonthStart);
            lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

            const monthlyQuery = `
                SELECT 
                    COALESCE(SUM(CASE WHEN invoice_type = 'sales' AND is_cancelled = false THEN grand_total ELSE 0 END), 0) as sales,
                    COALESCE(SUM(CASE WHEN invoice_type = 'purchase' AND is_cancelled = false THEN grand_total ELSE 0 END), 0) as purchases,
                    COALESCE(SUM(CASE WHEN invoice_type = 'sales' AND is_cancelled = false THEN grand_total ELSE 0 END), 0) - 
                    COALESCE(SUM(CASE WHEN invoice_type = 'purchase' AND is_cancelled = false THEN grand_total ELSE 0 END), 0) as profit
                FROM invoices
                WHERE business_id = $1 AND invoice_date >= $2 AND invoice_date < $3
            `;
            const currentMonth = await client.query(monthlyQuery, [businessId, currentMonthStart, new Date()]);
            const lastMonth = await client.query(monthlyQuery, [businessId, lastMonthStart, currentMonthStart]);

            return {
                time_series: timeSeries.rows.map(row => ({
                    date: row.date,
                    sales: parseFloat(row.sales) || 0,
                    purchases: parseFloat(row.purchases) || 0,
                    profit: parseFloat(row.profit) || 0,
                })),
                payment_modes: paymentModesWithPercentage,
                top_selling_items: topItems.rows.map(row => ({
                    id: row.id,
                    name: row.name,
                    quantity: parseFloat(row.quantity) || 0,
                    revenue: parseFloat(row.revenue) || 0,
                })),
                top_customers: topCustomers.rows.map(row => ({
                    id: row.id,
                    name: row.name,
                    party_type: row.party_type,
                    total_amount: parseFloat(row.total_amount) || 0,
                    invoice_count: parseInt(row.invoice_count) || 0,
                })),
                top_suppliers: topSuppliers.rows.map(row => ({
                    id: row.id,
                    name: row.name,
                    party_type: row.party_type,
                    total_amount: parseFloat(row.total_amount) || 0,
                    invoice_count: parseInt(row.invoice_count) || 0,
                })),
                monthly_comparison: {
                    current_month: {
                        sales: parseFloat(currentMonth.rows[0].sales) || 0,
                        purchases: parseFloat(currentMonth.rows[0].purchases) || 0,
                        profit: parseFloat(currentMonth.rows[0].profit) || 0,
                    },
                    last_month: {
                        sales: parseFloat(lastMonth.rows[0].sales) || 0,
                        purchases: parseFloat(lastMonth.rows[0].purchases) || 0,
                        profit: parseFloat(lastMonth.rows[0].profit) || 0,
                    },
                },
            };
        } finally {
            client.release();
        }
    },

    async getActivity(
        businessId: string,
        page: number,
        limit: number
    ): Promise<{ events: ActivityEvent[]; total: number }> {
        const offset = (page - 1) * limit;

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM analytics_events
            WHERE business_id = $1
        `;
        const countResult = await pool.query(countQuery, [businessId]);
        const total = parseInt(countResult.rows[0].total) || 0;

        // Get events with user names
        const eventsQuery = `
            SELECT 
                ae.id,
                ae.event_type,
                CASE 
                    WHEN ae.event_type = 'invoice_created' THEN 
                        CONCAT('Created ', ae.entity_type, ' invoice', COALESCE(' #' || (ae.event_data->>'invoice_number'), ''))
                    WHEN ae.event_type = 'payment_recorded' THEN 
                        CONCAT('Recorded ', (ae.event_data->>'payment_type'), ' payment of ₹', (ae.event_data->>'amount'))
                    WHEN ae.event_type = 'party_created' THEN 
                        CONCAT('Added new ', ae.entity_type, COALESCE(' - ' || (ae.event_data->>'name'), ''))
                    WHEN ae.event_type = 'inventory_created' THEN 
                        CONCAT('Added inventory item', COALESCE(' - ' || (ae.event_data->>'name'), ''))
                    WHEN ae.event_type = 'inventory_updated' THEN 
                        CONCAT('Updated inventory item', COALESCE(' - ' || (ae.event_data->>'name'), ''))
                    ELSE CONCAT(ae.event_type, ' - ', ae.entity_type, COALESCE(' #' || ae.entity_id, ''))
                END as description,
                u.name as user_name,
                ae.event_data as metadata,
                ae.occurred_at as created_at
            FROM analytics_events ae
            LEFT JOIN users u ON ae.actor_user_id = u.id
            WHERE ae.business_id = $1
            ORDER BY ae.occurred_at DESC
            LIMIT $2 OFFSET $3
        `;
        const eventsResult = await pool.query(eventsQuery, [businessId, limit, offset]);

        return {
            events: eventsResult.rows.map(row => ({
                ...row,
                metadata: row.metadata || {},
            })),
            total,
        };
    },
};
