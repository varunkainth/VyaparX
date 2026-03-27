import { ERROR_CODES } from "../constants/errorCodes";
import pool from "../config/db";
import { businessRepository } from "../repository/business.repository";
import { userRepository } from "../repository/user.repository";
import type {
    BusinessInviteParams,
    BusinessInviteDetails,
    BusinessMemberInviteInput,
    BusinessMemberMutationInput,
    BusinessMemberStatusInput,
    BusinessAssignableRole,
    CreateBusinessInput,
} from "../types/business";
import { AppError } from "../utils/appError";

export async function createBusinessWithOwnerMembership(input: CreateBusinessInput) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const business = await businessRepository.createBusiness(input, client);
        await businessRepository.upsertOwnerMember(business.id, input.owner_id, client);

        await client.query("COMMIT");
        return business;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

export async function listUserBusinesses(userId: string) {
    return businessRepository.listUserBusinesses(userId);
}

export async function getBusinessForUser(businessId: string, userId: string) {
    return businessRepository.getBusinessForUser(businessId, userId);
}

export async function updateBusiness(
    businessId: string,
    patch: Record<string, unknown>
) {
    const fields = Object.keys(patch);
    if (fields.length === 0) {
        throw new AppError("No updates provided", 400, ERROR_CODES.BAD_REQUEST);
    }

    return businessRepository.updateBusiness(businessId, patch);
}

export async function inviteOrUpsertBusinessMember(args: BusinessMemberInviteInput) {
    return businessRepository.inviteOrUpsertBusinessMember(args);
}

export async function createBusinessInvite(args: {
    businessId: string;
    email: string;
    role: BusinessAssignableRole;
    invitedBy: string;
    token: string;
    expiresAt: Date;
}) {
    return businessRepository.createBusinessInvite(args);
}

export async function getBusinessInviteByToken(token: string): Promise<BusinessInviteDetails | null> {
    return businessRepository.getBusinessInviteByToken(token);
}

export async function listBusinessInvites(businessId: string): Promise<BusinessInviteDetails[]> {
    return businessRepository.listBusinessInvites(businessId);
}

export async function acceptBusinessInvite(args: {
    token: string;
    userId: string;
}) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const invite = await businessRepository.getBusinessInviteByToken(args.token, client);
        if (!invite) {
            throw new AppError("Invite not found", 404, ERROR_CODES.NOT_FOUND);
        }

        if (invite.revoked_at) {
            throw new AppError("This invite has been revoked", 410, ERROR_CODES.BAD_REQUEST);
        }

        if (invite.accepted_at) {
            throw new AppError("This invite has already been accepted", 409, ERROR_CODES.DUPLICATE_RESOURCE);
        }

        if (new Date(invite.expires_at).getTime() <= Date.now()) {
            throw new AppError("This invite has expired", 410, ERROR_CODES.BAD_REQUEST);
        }

        const user = await userRepository.findById(args.userId, client);
        if (!user) {
            throw new AppError("User not found", 404, ERROR_CODES.USER_NOT_FOUND);
        }

        if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
            throw new AppError(
                "Sign in with the invited email address to accept this invite",
                403,
                ERROR_CODES.FORBIDDEN
            );
        }

        const member = await businessRepository.inviteOrUpsertBusinessMember(
            {
                businessId: invite.business_id,
                userId: args.userId,
                role: invite.role,
                invitedBy: invite.invited_by ?? args.userId,
            },
            client
        );
        await businessRepository.markBusinessInviteAccepted(args.token, args.userId, client);

        await client.query("COMMIT");
        return {
            invite,
            member,
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

export async function setBusinessMemberRole(args: BusinessMemberMutationInput) {
    return businessRepository.setBusinessMemberRole(args);
}

export async function setBusinessMemberStatus(args: BusinessMemberStatusInput) {
    return businessRepository.setBusinessMemberStatus(args);
}

export async function revokeBusinessInvite(args: { businessId: string; inviteId: string }) {
    return businessRepository.revokeBusinessInvite(args.businessId, args.inviteId);
}

export async function listBusinessMembers(businessId: string) {
    return businessRepository.getBusinessMembers(businessId);
}
