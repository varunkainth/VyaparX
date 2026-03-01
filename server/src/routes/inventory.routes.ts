import { Router } from "express";
import {
    adjustInventoryStockHandler,
    createInventoryItemHandler,
    deleteInventoryItemHandler,
    getInventoryItemHandler,
    listInventoryItemsHandler,
    listStockMovementsHandler,
    updateInventoryItemHandler,
} from "../controller/inventory.controller";
import { asyncHandler } from "../middleware/asyncHandler";
import { businessGuard } from "../middleware/businessGaurd";
import { authenticateToken } from "../middleware/jwt";
import { authorizeRoles } from "../middleware/roleGuard";
import { validate } from "../middleware/validate";
import {
    adjustInventoryStockSchema,
    createInventoryItemSchema,
    updateInventoryItemSchema,
} from "../validators/inventory.validator";

const inventoryRouter = Router();

inventoryRouter.use(authenticateToken);
inventoryRouter.use("/businesses/:business_id/inventory-items", businessGuard);

inventoryRouter.get(
    "/businesses/:business_id/inventory-items",
    authorizeRoles(["owner", "admin", "staff", "accountant", "viewer"]),
    asyncHandler(listInventoryItemsHandler)
);

inventoryRouter.post(
    "/businesses/:business_id/inventory-items",
    authorizeRoles(["owner", "admin", "staff", "accountant"]),
    validate(createInventoryItemSchema),
    asyncHandler(createInventoryItemHandler)
);

inventoryRouter.get(
    "/businesses/:business_id/inventory-items/:item_id",
    authorizeRoles(["owner", "admin", "staff", "accountant", "viewer"]),
    asyncHandler(getInventoryItemHandler)
);

inventoryRouter.patch(
    "/businesses/:business_id/inventory-items/:item_id",
    authorizeRoles(["owner", "admin", "staff", "accountant"]),
    validate(updateInventoryItemSchema),
    asyncHandler(updateInventoryItemHandler)
);

inventoryRouter.post(
    "/businesses/:business_id/inventory-items/:item_id/adjust-stock",
    authorizeRoles(["owner", "admin", "staff", "accountant"]),
    validate(adjustInventoryStockSchema),
    asyncHandler(adjustInventoryStockHandler)
);

inventoryRouter.delete(
    "/businesses/:business_id/inventory-items/:item_id",
    authorizeRoles(["owner", "admin", "staff", "accountant"]),
    asyncHandler(deleteInventoryItemHandler)
);

inventoryRouter.get(
    "/businesses/:business_id/stock-movements",
    authorizeRoles(["owner", "admin", "staff", "accountant", "viewer"]),
    asyncHandler(listStockMovementsHandler)
);

export default inventoryRouter;
