import apiClient from "../lib/api-client";
import type { ApiResponse } from "../types/auth";
import type {
  CreatePartyInput,
  ListPartiesQuery,
  Party,
  UpdatePartyInput,
} from "../types/party";

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

function transformParty(party: Party): Party {
  return {
    ...party,
    current_balance: toNumber(party.current_balance),
    opening_balance: toNumber(party.opening_balance),
  };
}

export const partyService = {
  async listParties(
    business_id: string,
    params?: ListPartiesQuery,
  ): Promise<Party[]> {
    const response = await apiClient.get<ApiResponse<Party[]>>(
      `/api/v1/businesses/${business_id}/parties`,
      { params },
    );

    return response.data.data.map(transformParty);
  },

  async getParty(
    business_id: string,
    party_id: string,
  ): Promise<Party> {
    const response = await apiClient.get<ApiResponse<Party>>(
      `/api/v1/businesses/${business_id}/parties/${party_id}`,
    );

    return transformParty(response.data.data);
  },

  async createParty(
    business_id: string,
    payload: CreatePartyInput,
  ): Promise<Party> {
    const response = await apiClient.post<ApiResponse<Party>>(
      `/api/v1/businesses/${business_id}/parties`,
      payload,
    );

    return transformParty(response.data.data);
  },

  async updateParty(
    business_id: string,
    party_id: string,
    payload: UpdatePartyInput,
  ): Promise<Party> {
    const response = await apiClient.patch<ApiResponse<Party>>(
      `/api/v1/businesses/${business_id}/parties/${party_id}`,
      payload,
    );

    return transformParty(response.data.data);
  },

  async deleteParty(
    business_id: string,
    party_id: string,
  ): Promise<Party> {
    const response = await apiClient.delete<ApiResponse<Party>>(
      `/api/v1/businesses/${business_id}/parties/${party_id}`,
    );

    return transformParty(response.data.data);
  },
};
