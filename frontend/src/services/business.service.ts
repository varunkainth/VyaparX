import apiClient from "@/lib/api-client";
import type {
  Business,
  BusinessWithRole,
  CreateBusinessInput,
  UpdateBusinessInput,
  InviteMemberInput,
  UpdateMemberRoleInput,
  UpdateMemberStatusInput,
  BusinessMember,
} from "@/types/business";
import type { Session, Tokens } from "@/types/auth";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface CreateBusinessResponse {
  business: Business;
  session: Session;
  tokens: Tokens;
}

const assertTokensPresent = (tokens: Tokens | undefined, operation: string): Tokens => {
  if (!tokens?.accessToken || !tokens?.refreshToken) {
    throw new Error(
      `Backend business response missing tokens during ${operation}. The backend deployment may be out of date.`
    );
  }
  return tokens;
};

export const businessService = {
  async createBusiness(data: CreateBusinessInput): Promise<CreateBusinessResponse> {
    const response = await apiClient.post<ApiResponse<CreateBusinessResponse>>(
      "/api/v1/businesses",
      data
    );
    return {
      ...response.data.data,
      tokens: assertTokensPresent(response.data.data.tokens, "create-business"),
    };
  },

  async listBusinesses(): Promise<BusinessWithRole[]> {
    const response = await apiClient.get<ApiResponse<any[]>>(
      "/api/v1/businesses"
    );
    // Map user_role to role for frontend compatibility
    return response.data.data.map((business: any) => ({
      ...business,
      role: business.user_role || business.role,
    }));
  },

  async getBusiness(businessId: string): Promise<BusinessWithRole> {
    const response = await apiClient.get<ApiResponse<any>>(
      `/api/v1/businesses/${businessId}`
    );
    // Map user_role to role for frontend compatibility
    const business = response.data.data;
    return {
      ...business,
      role: business.user_role || business.role,
    };
  },

  async updateBusiness(
    businessId: string,
    data: UpdateBusinessInput
  ): Promise<Business> {
    const response = await apiClient.patch<ApiResponse<Business>>(
      `/api/v1/businesses/${businessId}`,
      data
    );
    return response.data.data;
  },

  async inviteMember(
    businessId: string,
    data: InviteMemberInput
  ): Promise<BusinessMember> {
    const response = await apiClient.post<ApiResponse<BusinessMember>>(
      `/api/v1/businesses/${businessId}/members`,
      data
    );
    return response.data.data;
  },

  async updateMemberRole(
    businessId: string,
    userId: string,
    data: UpdateMemberRoleInput
  ): Promise<BusinessMember> {
    const response = await apiClient.patch<ApiResponse<BusinessMember>>(
      `/api/v1/businesses/${businessId}/members/${userId}/role`,
      data
    );
    return response.data.data;
  },

  async updateMemberStatus(
    businessId: string,
    userId: string,
    data: UpdateMemberStatusInput
  ): Promise<BusinessMember> {
    const response = await apiClient.patch<ApiResponse<BusinessMember>>(
      `/api/v1/businesses/${businessId}/members/${userId}/status`,
      data
    );
    return response.data.data;
  },
  async getBusinessMembers(businessId: string): Promise<BusinessMember[]> {
    const response = await apiClient.get<ApiResponse<BusinessMember[]>>(
      `/api/v1/businesses/${businessId}/members`
    );
    return response.data.data;
  },
};
