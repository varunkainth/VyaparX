import apiClient from "@/lib/api-client";
import type {
  Party,
  CreatePartyInput,
  UpdatePartyInput,
  ListPartiesQuery,
} from "@/types/party";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const partyService = {
  async listParties(businessId: string, query?: ListPartiesQuery): Promise<Party[]> {
    const params = new URLSearchParams();
    if (query?.include_inactive) {
      params.append("include_inactive", "true");
    }
    
    const url = `/api/v1/businesses/${businessId}/parties${params.toString() ? `?${params.toString()}` : ""}`;
    const response = await apiClient.get<ApiResponse<Party[]>>(url);
    return response.data.data;
  },

  async getParty(businessId: string, partyId: string): Promise<Party> {
    const response = await apiClient.get<ApiResponse<Party>>(
      `/api/v1/businesses/${businessId}/parties/${partyId}`
    );
    return response.data.data;
  },

  async createParty(businessId: string, data: CreatePartyInput): Promise<Party> {
    const response = await apiClient.post<ApiResponse<Party>>(
      `/api/v1/businesses/${businessId}/parties`,
      data
    );
    return response.data.data;
  },

  async updateParty(
    businessId: string,
    partyId: string,
    data: UpdatePartyInput
  ): Promise<Party> {
    const response = await apiClient.patch<ApiResponse<Party>>(
      `/api/v1/businesses/${businessId}/parties/${partyId}`,
      data
    );
    return response.data.data;
  },

  async deleteParty(businessId: string, partyId: string): Promise<void> {
    await apiClient.delete(
      `/api/v1/businesses/${businessId}/parties/${partyId}`
    );
  },
};
