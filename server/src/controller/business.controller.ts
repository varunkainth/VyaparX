import type { Request, Response } from "express";
import crypto from "crypto";
import env from "../config/env";
import { emailService } from "../config/email";
import { ERROR_CODES } from "../constants/errorCodes";
import { authService } from "../services/auth.service";
import { logAuditEvent } from "../services/audit.service";
import {
    acceptBusinessInvite,
    createBusinessInvite,
    createBusinessWithOwnerMembership,
    getBusinessForUser,
    getBusinessInviteByToken,
    listBusinessInvites,
    listUserBusinesses,
    listBusinessMembers,
    revokeBusinessInvite,
    setBusinessMemberRole,
    setBusinessMemberStatus,
    updateBusiness,
} from "../services/business.service";
import { AppError } from "../utils/appError";
import { setAuthCookies } from "../utils/authCookies";
import { sendSuccess } from "../utils/responseHandler";
import type {
    BusinessIdParams,
    BusinessInviteParams,
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
const generateOpaqueToken = () => crypto.randomBytes(32).toString("hex");

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
    const business = await getBusinessForUser(business_id, invitedBy);
    if (!business) {
        throw new AppError("Business not found", 404, ERROR_CODES.NOT_FOUND);
    }

    const inviteToken = generateOpaqueToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invite = await createBusinessInvite({
        businessId: business_id,
        email,
        role,
        invitedBy,
        token: inviteToken,
        expiresAt,
    });

    const frontendUrl = env.FRONTEND_URL || "http://localhost:3000";
    const inviteUrl = `${frontendUrl}/accept-invite?token=${encodeURIComponent(inviteToken)}`;
    let emailSent = false;

    if (emailService.isReady()) {
        try {
            await emailService.sendBusinessInviteEmail({
                to: email,
                invitedEmail: email,
                businessName: business.name,
                inviterName: req.user?.email || "A VyaparX team member",
                role,
                inviteUrl,
            });
            emailSent = true;
        } catch (error) {
            console.error("Failed to send business invite email:", error);
        }
    }

    await logAuditEvent({
        business_id,
        actor_user_id: invitedBy,
        action: "business_member_invited",
        entity_type: "business_invite",
        entity_id: invite.id,
        metadata: { email, role, email_sent: emailSent },
    });

    return sendSuccess(res, {
        message: "Business member invited",
        data: {
            invite,
            invite_url: inviteUrl,
            email_sent: emailSent,
        },
    });
};

export const getBusinessInvite = async (
    req: Request<{ token: string }>,
    res: Response
) => {
    const invite = await getBusinessInviteByToken(req.params.token);
    if (!invite) {
        throw new AppError("Invite not found", 404, ERROR_CODES.NOT_FOUND);
    }

    return sendSuccess(res, {
        message: "Business invite fetched",
        data: invite,
    });
};

export const acceptInvite = async (
    req: Request<{ token: string }>,
    res: Response
) => {
    const userId = ensureAuthUser(req);
    const accepted = await acceptBusinessInvite({
        token: req.params.token,
        userId,
    });
    const tokens = await authService.generateTokensForUserSession({
        userId,
        businessId: accepted.invite.business_id,
    });
    setAuthCookies(res, tokens);

    return sendSuccess(res, {
        message: "Invite accepted",
        data: {
            invite: accepted.invite,
            member: accepted.member,
            tokens,
            session: {
                business_id: accepted.invite.business_id,
                role: accepted.member.role,
            },
        },
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

export const getBusinessInvites = async (req: Request<BusinessIdParams>, res: Response) => {
    ensureAuthUser(req);
    const business_id = getBusinessId(req.params);

    const invites = await listBusinessInvites(business_id);

    return sendSuccess(res, {
        message: "Business invites fetched",
        data: invites,
    });
};

export const revokeInvite = async (req: Request<BusinessInviteParams>, res: Response) => {
    const actorUserId = ensureAuthUser(req);
    const business_id = getBusinessId(req.params);
    const invite_id = req.params.invite_id;

    const invite = await revokeBusinessInvite({
        businessId: business_id,
        inviteId: invite_id,
    });

    if (!invite) {
        throw new AppError("Pending invite not found", 404, ERROR_CODES.NOT_FOUND);
    }

    await logAuditEvent({
        business_id,
        actor_user_id: actorUserId,
        action: "business_member_invite_revoked",
        entity_type: "business_invite",
        entity_id: invite.id,
        metadata: { email: invite.email, role: invite.role },
    });

    return sendSuccess(res, {
        message: "Business invite revoked",
        data: invite,
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
