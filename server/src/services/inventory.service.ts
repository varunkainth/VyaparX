import pool from "../config/db";
import { ERROR_CODES } from "../constants/errorCodes";
import { inventoryRepository } from "../repository/inventory.repository";
import type { AdjustInventoryStockInput, CreateInventoryInput } from "../types/inventory";
import { AppError } from "../utils/appError";
import { trackAnalyticsEvent } from "./analytics.service";

export async function createInventoryItem(input: CreateInventoryInput) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const item = await inventoryRepository.createItem(input, client);

        if ((input.opening_stock ?? 0) > 0) {
            await inventoryRepository.insertStockMovement(
                {
                    business_id: input.business_id,
                    item_id: item.id,
                    movement_type: "adjustment",
                    quantity: input.opening_stock ?? 0,
                    direction: "in",
                    reference_type: "manual",
                    unit_price: input.purchase_price,
                    notes: input.opening_stock_note ?? "Opening stock",
                    created_by: input.created_by,
                },
                client
            );
        }

        await client.query("COMMIT");

        void trackAnalyticsEvent({
            business_id: input.business_id,
            event_type: "inventory_item_created",
            entity_type: "inventory_item",
            entity_id: item.id,
            actor_user_id: input.created_by,
            event_data: {
                name: item.name,
                sku: item.sku ?? null,
                opening_stock: input.opening_stock ?? 0,
            },
        });

        return item;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

export async function listInventoryItems(businessId: string, includeInactive = false) {
    return inventoryRepository.listItems(businessId, includeInactive);
}

export async function getInventoryItemById(businessId: string, itemId: string) {
    return inventoryRepository.getItemById(businessId, itemId);
}

export async function updateInventoryItem(
    businessId: string,
    itemId: string,
    patch: Record<string, unknown>
) {
    const fields = Object.keys(patch);
    if (fields.length === 0) {
        throw new AppError("No updates provided", 400, ERROR_CODES.BAD_REQUEST);
    }

    const updated = await inventoryRepository.updateItem(businessId, itemId, patch);

    if (updated) {
        void trackAnalyticsEvent({
            business_id: businessId,
            event_type: "inventory_item_updated",
            entity_type: "inventory_item",
            entity_id: updated.id,
            event_data: {
                changes: patch,
            },
        });
    }

    return updated;
}

export async function deactivateInventoryItem(businessId: string, itemId: string) {
    const deactivated = await inventoryRepository.deactivateItem(businessId, itemId);

    if (deactivated) {
        void trackAnalyticsEvent({
            business_id: businessId,
            event_type: "inventory_item_deactivated",
            entity_type: "inventory_item",
            entity_id: deactivated.id,
        });
    }

    return deactivated;
}

export async function adjustInventoryStock(args: AdjustInventoryStockInput) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const item = await inventoryRepository.lockActiveItemStock(args.businessId, args.itemId, client);
        if (!item) {
            throw new AppError("Inventory item not found", 404, ERROR_CODES.INVENTORY_ITEM_NOT_FOUND);
        }

        const currentStock = Number(item.current_stock);
        const nextStock =
            args.direction === "in"
                ? currentStock + args.quantity
                : currentStock - args.quantity;

        if (nextStock < 0) {
            throw new AppError("Insufficient stock for adjustment", 409, ERROR_CODES.STOCK_INSUFFICIENT);
        }

        await inventoryRepository.updateCurrentStock(args.itemId, nextStock, client);

        const movementType = args.direction === "in" ? "return_in" : "return_out";
        await inventoryRepository.insertStockMovement(
            {
                business_id: args.businessId,
                item_id: args.itemId,
                movement_type: movementType,
                quantity: args.quantity,
                direction: args.direction,
                reference_type: "manual",
                unit_price: args.unit_price ?? null,
                notes: args.notes ?? null,
                created_by: args.created_by,
            },
            client
        );

        await client.query("COMMIT");

        void trackAnalyticsEvent({
            business_id: args.businessId,
            event_type: "inventory_stock_adjusted",
            entity_type: "inventory_item",
            entity_id: args.itemId,
            actor_user_id: args.created_by,
            event_data: {
                direction: args.direction,
                quantity: args.quantity,
                previous_stock: currentStock,
                current_stock: nextStock,
            },
        });

        return { item_id: args.itemId, previous_stock: currentStock, current_stock: nextStock };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}
