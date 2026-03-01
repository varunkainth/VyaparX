import { Router } from "express";
import { getLedgerStatementHandler } from "../controller/ledger.controller";
import { asyncHandler } from "../middleware/asyncHandler";
import { businessGuard } from "../middleware/businessGaurd";
import { authenticateToken } from "../middleware/jwt";
import { authorizeRoles } from "../middleware/roleGuard";

const ledgerRouter = Router();

ledgerRouter.use(authenticateToken);
ledgerRouter.use("/businesses/:business_id/ledger", businessGuard);

ledgerRouter.get(
    "/businesses/:business_id/ledger/statement",
    authorizeRoles(["owner", "admin", "staff", "accountant", "viewer"]),
    asyncHandler(getLedgerStatementHandler)
);

export default ledgerRouter;
