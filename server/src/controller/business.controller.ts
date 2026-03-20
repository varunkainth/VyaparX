import type { Request, Response } from "express";
import { ERROR_CODES } from "../constants/errorCodes";
import { userRepository } from "../repository/user.repository";
import { authService } from "../services/auth.service";
import { logAuditEvent } from "../services/audit.service";
import {
    createBusinessWithOwnerMembership,
    getBusinessForUser,
    inviteOrUpsertBusinessMember,
    listUserBusinesses,
    listBusinessMembers,
    setBusinessMemberRole,
    setBusinessMemberStatus,
    updateBusiness,
} from "../services/business.service";
import { AppError } from "../utils/appError";
import { setAuthCookies } from "../utils/authCookies";
import { sendSuccess } from "../utils/responseHandler";
import type {
    BusinessIdParams,
    BusinessMemberParams,
    CreateBusinessBody,
    InviteBusinessMemberBody,
    UpdateBusinessMemberRoleBody,
    UpdateBusinessMemberStatusBody,
} from "../types/business";
import type { JsonObject } from "../types/common";

const ensureAuthUser = (req: Request) => {
    if (!req.user?.id) {
        throw new AppError("Authentication required", 401, ERROR_CODES.UNAUTHORIZED);
    }
    return req.user.id;
};

const getBusinessId = (params: Partial<BusinessIdParams>): string => {
    const raw = params.business_id;
    const businessId = Array.isArray(raw) ? raw[0] : raw;
    if (!businessId) {
        throw new AppError("Business ID missing in route", 400, ERROR_CODES.BAD_REQUEST);
    }
    return businessId;
};

const getTargetUserId = (params: Partial<BusinessMemberParams>): string => {
    const raw = params.user_id;
    const userId = Array.isArray(raw) ? raw[0] : raw;
    if (!userId) {
        throw new AppError("User ID missing in route", 400, ERROR_CODES.BAD_REQUEST);
    }
    return userId;
};

export const createBusiness = async (req: Request<{}, unknown, CreateBusinessBody>, res: Response) => {
    const userId = ensureAuthUser(req);
    const business = await createBusinessWithOwnerMembership({
        owner_id: userId,
        ...req.body,
    });
    const tokens = await authService.generateTokensForUserSession({
        userId,
        businessId: business.id,
    });
    setAuthCookies(res, tokens);

    return sendSuccess(res, {
        statusCode: 201,
        message: "Business created",
        data: {
            business,
            tokens,
            session: {
                business_id: business.id,
                role: "owner",
            },
        },
    });
};

export const listBusinesses = async (req: Request, res: Response) => {
    const userId = ensureAuthUser(req);
    const businesses = await listUserBusinesses(userId);
    return sendSuccess(res, {
        message: "Businesses fetched",
        data: businesses,
    });
};

export const getBusiness = async (req: Request<BusinessIdParams>, res: Response) => {
    const userId = ensureAuthUser(req);
    const business_id = getBusinessId(req.params);

    const business = await getBusinessForUser(business_id, userId);
    if (!business) {
        throw new AppError("Business not found", 404, ERROR_CODES.NOT_FOUND);
    }

    return sendSuccess(res, {
        message: "Business fetched",
        data: business,
    });
};

export const updateBusinessById = async (
    req: Request<BusinessIdParams, unknown, JsonObject>,
    res: Response
) => {
    const business_id = getBusinessId(req.params);
    const business = await updateBusiness(business_id, req.body);
    if (!business) {
        throw new AppError("Business not found", 404, ERROR_CODES.NOT_FOUND);
    }

    return sendSuccess(res, {
        message: "Business updated",
        data: business,
    });
};

export const inviteBusinessMember = async (
    req: Request<BusinessIdParams, unknown, InviteBusinessMemberBody>,
    res: Response
) => {
    const invitedBy = ensureAuthUser(req);
    const business_id = getBusinessId(req.params);
    const { email, role } = req.body;

    const user = await userRepository.findByEmail(email);
    if (!user) {
        throw new AppError("User not found with that email", 404, ERROR_CODES.USER_NOT_FOUND);
    }

    const member = await inviteOrUpsertBusinessMember({
        businessId: business_id,
        userId: user.id,
        role,
        invitedBy,
    });

    await logAuditEvent({
        business_id,
        actor_user_id: invitedBy,
        action: "business_member_invited",
        entity_type: "business_member",
        entity_id: member.id,
        metadata: { user_id: user.id, role },
    });

    return sendSuccess(res, {
        message: "Business member invited",
        data: member,
    });
};

export const getBusinessMembers = async (req: Request<BusinessIdParams>, res: Response) => {
    ensureAuthUser(req);
    const business_id = getBusinessId(req.params);

    const members = await listBusinessMembers(business_id);

    return sendSuccess(res, {
        message: "Business members fetched",
        data: members,
    });
};

export const updateMemberRole = async (
    req: Request<BusinessMemberParams, unknown, UpdateBusinessMemberRoleBody>,
    res: Response
) => {
    const actorUserId = ensureAuthUser(req);
    const business_id = getBusinessId(req.params);
    const user_id = getTargetUserId(req.params);
    const { role } = req.body;

    const member = await setBusinessMemberRole({
        businessId: business_id,
        userId: user_id,
        role,
    });
    if (!member) {
        throw new AppError("Business member not found", 404, ERROR_CODES.NOT_FOUND);
    }

    await logAuditEvent({
        business_id,
        actor_user_id: actorUserId,
        action: "business_member_role_updated",
        entity_type: "business_member",
        entity_id: member.id,
        metadata: { user_id, role },
    });

    return sendSuccess(res, {
        message: "Business member role updated",
        data: member,
    });
};

export const updateMemberStatus = async (
    req: Request<BusinessMemberParams, unknown, UpdateBusinessMemberStatusBody>,
    res: Response
) => {
    const actorUserId = ensureAuthUser(req);
    const business_id = getBusinessId(req.params);
    const user_id = getTargetUserId(req.params);
    const { is_active } = req.body;

    const member = await setBusinessMemberStatus({
        businessId: business_id,
        userId: user_id,
        isActive: is_active,
    });
    if (!member) {
        throw new AppError("Business member not found", 404, ERROR_CODES.NOT_FOUND);
    }

    await logAuditEvent({
        business_id,
        actor_user_id: actorUserId,
        action: "business_member_status_updated",
        entity_type: "business_member",
        entity_id: member.id,
        metadata: { user_id, is_active },
    });

    return sendSuccess(res, {
        message: "Business member status updated",
        data: member,
    });
};
