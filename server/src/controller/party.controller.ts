import type { Request, Response } from "express";
import { ERROR_CODES } from "../constants/errorCodes";
import {
    createParty,
    deactivateParty,
    getPartyById,
    listParties,
    updateParty,
} from "../services/party.service";
import type { JsonObject } from "../types/common";
import type { CreatePartyBody, PartyParams } from "../types/party";
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

const getPartyId = (req: Request<PartyParams>): string => {
    const raw = req.params.party_id;
    const partyId = Array.isArray(raw) ? raw[0] : raw;
    if (!partyId) {
        throw new AppError("Party ID missing in route", 400, ERROR_CODES.BAD_REQUEST);
    }
    return partyId;
};

export const createPartyHandler = async (
    req: Request<{ business_id: string }, unknown, CreatePartyBody>,
    res: Response
) => {
    const businessId = getBusinessId(req);
    const party = await createParty({
        business_id: businessId,
        ...req.body,
    });

    return sendSuccess(res, {
        statusCode: 201,
        message: "Party created",
        data: party,
    });
};

export const listPartiesHandler = async (
    req: Request<{ business_id: string }>,
    res: Response
) => {
    const businessId = getBusinessId(req);
    const includeInactive = String(req.query.include_inactive || "false") === "true";
    const parties = await listParties(businessId, includeInactive);

    return sendSuccess(res, {
        message: "Parties fetched",
        data: parties,
    });
};

export const getPartyHandler = async (req: Request<PartyParams>, res: Response) => {
    const businessId = getBusinessId(req);
    const party_id = getPartyId(req);

    const party = await getPartyById(businessId, party_id);
    if (!party) {
        throw new AppError("Party not found", 404, ERROR_CODES.PARTY_NOT_FOUND);
    }

    return sendSuccess(res, {
        message: "Party fetched",
        data: party,
    });
};

export const updatePartyHandler = async (
    req: Request<PartyParams, unknown, JsonObject>,
    res: Response
) => {
    const businessId = getBusinessId(req);
    const party_id = getPartyId(req);

    const party = await updateParty(businessId, party_id, req.body);
    if (!party) {
        throw new AppError("Party not found", 404, ERROR_CODES.PARTY_NOT_FOUND);
    }

    return sendSuccess(res, {
        message: "Party updated",
        data: party,
    });
};

export const deletePartyHandler = async (req: Request<PartyParams>, res: Response) => {
    const businessId = getBusinessId(req);
    const party_id = getPartyId(req);

    const party = await deactivateParty(businessId, party_id);
    if (!party) {
        throw new AppError("Party not found", 404, ERROR_CODES.PARTY_NOT_FOUND);
    }

    return sendSuccess(res, {
        message: "Party deactivated",
        data: party,
    });
};
