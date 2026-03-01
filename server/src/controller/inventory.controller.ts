import type { Request, Response } from "express";
import { ERROR_CODES } from "../constants/errorCodes";
import {
    adjustInventoryStock,
    createInventoryItem,
    deactivateInventoryItem,
    getInventoryItemById,
    listInventoryItems,
    updateInventoryItem,
} from "../services/inventory.service";
import type { AdjustInventoryStockBody } from "../types/inventory";
import type { JsonObject } from "../types/common";
import type {
    CreateInventoryBody,
    InventoryItemParams,
} from "../types/inventory";
import { AppError } from "../utils/appError";
import { sendSuccess } from "../utils/responseHandler";

const getBusinessId = (req: Request<{ business_id: string }>): string => {
    const raw = req.params.business_id;
    const businessId = Array.isArray(raw) ? raw[0] : raw;
    if (!businessId) {
        throw new AppError("Business ID missing in route", 400, ERROR_CODES.BAD_REQUEST);
    }
    return businessId;
};

const getItemId = (req: Request<InventoryItemParams>): string => {
    const raw = req.params.item_id;
    const itemId = Array.isArray(raw) ? raw[0] : raw;
    if (!itemId) {
        throw new AppError("Item ID missing in route", 400, ERROR_CODES.BAD_REQUEST);
    }
    return itemId;
};

export const createInventoryItemHandler = async (
    req: Request<{ business_id: string }, unknown, CreateInventoryBody>,
    res: Response
) => {
    if (!req.user?.id) {
        throw new AppError("Authentication required", 401, ERROR_CODES.UNAUTHORIZED);
    }

    const businessId = getBusinessId(req);
    const item = await createInventoryItem({
        business_id: businessId,
        created_by: req.user.id,
        ...req.body,
    });

    return sendSuccess(res, {
        statusCode: 201,
        message: "Inventory item created",
        data: item,
    });
};

export const listInventoryItemsHandler = async (
    req: Request<{ business_id: string }>,
    res: Response
) => {
    const businessId = getBusinessId(req);
    const includeInactive = String(req.query.include_inactive || "false") === "true";
    const items = await listInventoryItems(businessId, includeInactive);

    return sendSuccess(res, {
        message: "Inventory items fetched",
        data: items,
    });
};

export const getInventoryItemHandler = async (req: Request<InventoryItemParams>, res: Response) => {
    const businessId = getBusinessId(req);
    const itemId = getItemId(req);

    const item = await getInventoryItemById(businessId, itemId);
    if (!item) {
        throw new AppError("Inventory item not found", 404, ERROR_CODES.INVENTORY_ITEM_NOT_FOUND);
    }

    return sendSuccess(res, {
        message: "Inventory item fetched",
        data: item,
    });
};

export const updateInventoryItemHandler = async (
    req: Request<InventoryItemParams, unknown, JsonObject>,
    res: Response
) => {
    const businessId = getBusinessId(req);
    const itemId = getItemId(req);

    const item = await updateInventoryItem(businessId, itemId, req.body);
    if (!item) {
        throw new AppError("Inventory item not found", 404, ERROR_CODES.INVENTORY_ITEM_NOT_FOUND);
    }

    return sendSuccess(res, {
        message: "Inventory item updated",
        data: item,
    });
};

export const deleteInventoryItemHandler = async (req: Request<InventoryItemParams>, res: Response) => {
    const businessId = getBusinessId(req);
    const itemId = getItemId(req);

    const item = await deactivateInventoryItem(businessId, itemId);
    if (!item) {
        throw new AppError("Inventory item not found", 404, ERROR_CODES.INVENTORY_ITEM_NOT_FOUND);
    }

    return sendSuccess(res, {
        message: "Inventory item deactivated",
        data: item,
    });
};

export const adjustInventoryStockHandler = async (
    req: Request<InventoryItemParams, unknown, AdjustInventoryStockBody>,
    res: Response
) => {
    if (!req.user?.id) {
        throw new AppError("Authentication required", 401, ERROR_CODES.UNAUTHORIZED);
    }

    const businessId = getBusinessId(req);
    const itemId = getItemId(req);
    const { quantity, direction, unit_price, notes } = req.body;

    const result = await adjustInventoryStock({
        businessId,
        itemId,
        quantity,
        direction,
        unit_price,
        notes,
        created_by: req.user.id,
    });

    return sendSuccess(res, {
        message: "Inventory stock adjusted",
        data: result,
    });
};

export const listStockMovementsHandler = async (
    req: Request<{ business_id: string }>,
    res: Response
) => {
    const businessId = getBusinessId(req);
    const itemId = req.query.item_id as string | undefined;
    
    const { inventoryRepository } = await import("../repository/inventory.repository");
    const movements = await inventoryRepository.listStockMovements(businessId, itemId);

    return sendSuccess(res, {
        message: "Stock movements fetched",
        data: movements,
    });
};
