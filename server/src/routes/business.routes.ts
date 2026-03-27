import { Router } from "express";
import {
    acceptInvite,
    createBusiness,
    getBusiness,
    getBusinessInvite,
    getBusinessInvites,
    getBusinessMembers,
    inviteBusinessMember,
    listBusinesses,
    revokeInvite,
    updateBusinessById,
    updateMemberRole,
    updateMemberStatus,
} from "../controller/business.controller";
import { asyncHandler } from "../middleware/asyncHandler";
import { businessGuard } from "../middleware/businessGaurd";
import { authenticateToken } from "../middleware/jwt";
import { authorizeRoles } from "../middleware/roleGuard";
import { validate } from "../middleware/validate";
import {
    createBusinessSchema,
    inviteBusinessMemberSchema,
    updateBusinessMemberRoleSchema,
    updateBusinessMemberStatusSchema,
    updateBusinessSchema,
} from "../validators/business.validator";

const businessRouter = Router();

businessRouter.get(
    "/business-invites/:token",
    asyncHandler(getBusinessInvite)
);

businessRouter.use(authenticateToken);

businessRouter.post(
    "/business-invites/:token/accept",
    asyncHandler(acceptInvite)
);

businessRouter.get("/businesses", asyncHandler(listBusinesses));
businessRouter.post("/businesses", validate(createBusinessSchema), asyncHandler(createBusiness));

businessRouter.get(
    "/businesses/:business_id",
    businessGuard,
    authorizeRoles(["owner", "admin", "staff", "accountant", "viewer"]),
    asyncHandler(getBusiness)
);

businessRouter.get(
    "/businesses/:business_id/members",
    businessGuard,
    authorizeRoles(["owner", "admin", "staff", "accountant", "viewer"]),
    asyncHandler(getBusinessMembers)
);

businessRouter.get(
    "/businesses/:business_id/invites",
    businessGuard,
    authorizeRoles(["owner", "admin"]),
    asyncHandler(getBusinessInvites)
);

businessRouter.patch(
    "/businesses/:business_id",
    businessGuard,
    authorizeRoles(["owner", "admin"]),
    validate(updateBusinessSchema),
    asyncHandler(updateBusinessById)
);

businessRouter.post(
    "/businesses/:business_id/members/invite",
    businessGuard,
    authorizeRoles(["owner", "admin"]),
    validate(inviteBusinessMemberSchema),
    asyncHandler(inviteBusinessMember)
);

businessRouter.post(
    "/businesses/:business_id/invites/:invite_id/revoke",
    businessGuard,
    authorizeRoles(["owner", "admin"]),
    asyncHandler(revokeInvite)
);

businessRouter.patch(
    "/businesses/:business_id/members/:user_id/role",
    businessGuard,
    authorizeRoles(["owner", "admin"]),
    validate(updateBusinessMemberRoleSchema),
    asyncHandler(updateMemberRole)
);

businessRouter.patch(
    "/businesses/:business_id/members/:user_id/status",
    businessGuard,
    authorizeRoles(["owner", "admin"]),
    validate(updateBusinessMemberStatusSchema),
    asyncHandler(updateMemberStatus)
);

export default businessRouter;
