import { ERROR_CODES } from "../constants/errorCodes";
import pool from "../config/db";
import { businessRepository } from "../repository/business.repository";
import type {
    BusinessMemberInviteInput,
    BusinessMemberMutationInput,
    BusinessMemberStatusInput,
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

export async function setBusinessMemberRole(args: BusinessMemberMutationInput) {
    return businessRepository.setBusinessMemberRole(args);
}

export async function setBusinessMemberStatus(args: BusinessMemberStatusInput) {
    return businessRepository.setBusinessMemberStatus(args);
}
