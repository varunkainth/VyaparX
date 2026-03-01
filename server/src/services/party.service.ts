import { ERROR_CODES } from "../constants/errorCodes";
import { partyRepository } from "../repository/party.repository";
import type { CreatePartyInput } from "../types/party";
import { AppError } from "../utils/appError";
import { trackAnalyticsEvent } from "./analytics.service";

const computeCurrentBalance = (openingBalance = 0, openingType: "receivable" | "payable" | "none" = "none") => {
    if (openingType === "receivable") return openingBalance;
    if (openingType === "payable") return openingBalance * -1;
    return 0;
};

export async function createParty(input: CreatePartyInput) {
    const openingBalance = input.opening_balance ?? 0;
    const openingType = input.opening_balance_type ?? "none";
    const currentBalance = computeCurrentBalance(openingBalance, openingType);

    const party = await partyRepository.createParty({
        ...input,
        opening_balance: openingBalance,
        opening_balance_type: openingType,
        current_balance: currentBalance,
    });

    void trackAnalyticsEvent({
        business_id: input.business_id,
        event_type: "party_created",
        entity_type: "party",
        entity_id: party.id,
        event_data: {
            party_type: party.party_type,
            name: party.name,
        },
    });

    return party;
}

export async function listParties(businessId: string, includeInactive = false) {
    return partyRepository.listParties(businessId, includeInactive);
}

export async function getPartyById(businessId: string, partyId: string) {
    return partyRepository.getPartyById(businessId, partyId);
}

export async function updateParty(
    businessId: string,
    partyId: string,
    patch: Record<string, unknown>
) {
    const fields = Object.keys(patch);
    if (fields.length === 0) {
        throw new AppError("No updates provided", 400, ERROR_CODES.BAD_REQUEST);
    }

    const updated = await partyRepository.updateParty(businessId, partyId, patch);

    if (updated) {
        void trackAnalyticsEvent({
            business_id: businessId,
            event_type: "party_updated",
            entity_type: "party",
            entity_id: updated.id,
            event_data: {
                changes: patch,
            },
        });
    }

    return updated;
}

export async function deactivateParty(businessId: string, partyId: string) {
    const deactivated = await partyRepository.deactivateParty(businessId, partyId);

    if (deactivated) {
        void trackAnalyticsEvent({
            business_id: businessId,
            event_type: "party_deactivated",
            entity_type: "party",
            entity_id: deactivated.id,
        });
    }

    return deactivated;
}
