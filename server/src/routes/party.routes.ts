import { Router } from "express";
import {
    createPartyHandler,
    deletePartyHandler,
    getPartyHandler,
    listPartiesHandler,
    updatePartyHandler,
} from "../controller/party.controller";
import { asyncHandler } from "../middleware/asyncHandler";
import { businessGuard } from "../middleware/businessGaurd";
import { authenticateToken } from "../middleware/jwt";
import { authorizeRoles } from "../middleware/roleGuard";
import { validate } from "../middleware/validate";
import { createPartySchema, updatePartySchema } from "../validators/party.validator";

const partyRouter = Router();

partyRouter.use(authenticateToken);
partyRouter.use("/businesses/:business_id/parties", businessGuard);

partyRouter.get(
    "/businesses/:business_id/parties",
    authorizeRoles(["owner", "admin", "staff", "accountant", "viewer"]),
    asyncHandler(listPartiesHandler)
);

partyRouter.post(
    "/businesses/:business_id/parties",
    authorizeRoles(["owner", "admin", "staff", "accountant"]),
    validate(createPartySchema),
    asyncHandler(createPartyHandler)
);

partyRouter.get(
    "/businesses/:business_id/parties/:party_id",
    authorizeRoles(["owner", "admin", "staff", "accountant", "viewer"]),
    asyncHandler(getPartyHandler)
);

partyRouter.patch(
    "/businesses/:business_id/parties/:party_id",
    authorizeRoles(["owner", "admin", "staff", "accountant"]),
    validate(updatePartySchema),
    asyncHandler(updatePartyHandler)
);

partyRouter.delete(
    "/businesses/:business_id/parties/:party_id",
    authorizeRoles(["owner", "admin", "staff", "accountant"]),
    asyncHandler(deletePartyHandler)
);

export default partyRouter;
