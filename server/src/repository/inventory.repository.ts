import pool from "../config/db";
import type { PoolClient } from "pg";
import type { CreateInventoryInput } from "../types/inventory";

const getDb = (client?: PoolClient) => client ?? pool;

export const inventoryRepository = {
    async createItem(
        input: Omit<CreateInventoryInput, "created_by" | "opening_stock_note">,
        client?: PoolClient
    ) {
        const db = getDb(client);
        const result = await db.query(
            `
            INSERT INTO inventory_items (
                business_id,name,sku,hsn_code,description,unit,gst_rate,purchase_price,
                selling_price,current_stock,low_stock_threshold,is_active
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true)
            RETURNING *
            `,
            [
                input.business_id,
                input.name,
                input.sku ?? null,
                input.hsn_code ?? null,
                input.description ?? null,
                input.unit,
                input.gst_rate,
                input.purchase_price,
                input.selling_price,
                input.opening_stock ?? 0,
                input.low_stock_threshold ?? 0,
            ]
        );
        return result.rows[0];
    },

    async insertStockMovement(
        args: {
            business_id: string;
            item_id: string;
            movement_type: string;
            quantity: number;
            direction: "in" | "out";
            reference_type: "manual" | "invoice" | "purchase_order" | "payment";
            unit_price?: number | null;
            notes?: string | null;
            created_by?: string | null;
            reference_id?: string | null;
        },
        client?: PoolClient
    ) {
        const db = getDb(client);
        await db.query(
            `
            INSERT INTO stock_movements (
                business_id,item_id,movement_type,quantity,direction,reference_type,reference_id,unit_price,notes,created_by
            )
            VALUES ($1,$2,$3::movement_type,$4,$5::direction,$6::reference_type,$7,$8,$9,$10)
            `,
            [
                args.business_id,
                args.item_id,
                args.movement_type,
                args.quantity,
                args.direction,
                args.reference_type,
                args.reference_id ?? null,
                args.unit_price ?? null,
                args.notes ?? null,
                args.created_by ?? null,
            ]
        );
    },

    async listItems(businessId: string, includeInactive: boolean) {
        const result = await pool.query(
            `
            SELECT *
            FROM inventory_items
            WHERE business_id = $1
              AND ($2::boolean = true OR is_active = true)
            ORDER BY created_at DESC
            `,
            [businessId, includeInactive]
        );
        return result.rows;
    },

    async getItemById(businessId: string, itemId: string) {
        const result = await pool.query(
            `
            SELECT *
            FROM inventory_items
            WHERE business_id = $1
              AND id = $2
            `,
            [businessId, itemId]
        );
        return result.rows[0] ?? null;
    },

    async updateItem(businessId: string, itemId: string, patch: Record<string, unknown>) {
        const fields = Object.keys(patch);
        const setSql = fields.map((f, i) => `${f} = $${i + 1}`).concat("updated_at = now()").join(", ");
        const values = fields.map((f) => patch[f]);
        const result = await pool.query(
            `
            UPDATE inventory_items
            SET ${setSql}
            WHERE business_id = $${fields.length + 1}
              AND id = $${fields.length + 2}
            RETURNING *
            `,
            [...values, businessId, itemId]
        );
        return result.rows[0] ?? null;
    },

    async deactivateItem(businessId: string, itemId: string) {
        const result = await pool.query(
            `
            UPDATE inventory_items
            SET is_active = false, updated_at = now()
            WHERE business_id = $1
              AND id = $2
            RETURNING *
            `,
            [businessId, itemId]
        );
        return result.rows[0] ?? null;
    },

    async lockActiveItemStock(businessId: string, itemId: string, client?: PoolClient) {
        const db = getDb(client);
        const result = await db.query(
            `
            SELECT id, current_stock
            FROM inventory_items
            WHERE business_id = $1
              AND id = $2
              AND is_active = true
            FOR UPDATE
            `,
            [businessId, itemId]
        );
        return result.rows[0] ?? null;
    },

    async updateCurrentStock(itemId: string, nextStock: number, client?: PoolClient) {
        const db = getDb(client);
        await db.query(
            `
            UPDATE inventory_items
            SET current_stock = $1, updated_at = now()
            WHERE id = $2
            `,
            [nextStock, itemId]
        );
    },

    async listStockMovements(businessId: string, itemId?: string) {
        const query = itemId
            ? `
            SELECT 
                sm.*,
                ii.name as item_name,
                ii.unit as item_unit,
                u.name as created_by_name,
                u.email as created_by_email
            FROM stock_movements sm
            LEFT JOIN inventory_items ii ON sm.item_id = ii.id
            LEFT JOIN users u ON sm.created_by = u.id
            WHERE sm.business_id = $1 AND sm.item_id = $2
            ORDER BY sm.created_at DESC
            `
            : `
            SELECT 
                sm.*,
                ii.name as item_name,
                ii.unit as item_unit,
                u.name as created_by_name,
                u.email as created_by_email
            FROM stock_movements sm
            LEFT JOIN inventory_items ii ON sm.item_id = ii.id
            LEFT JOIN users u ON sm.created_by = u.id
            WHERE sm.business_id = $1
            ORDER BY sm.created_at DESC
            `;
        
        const params = itemId ? [businessId, itemId] : [businessId];
        const result = await pool.query(query, params);
        return result.rows;
    },
};
