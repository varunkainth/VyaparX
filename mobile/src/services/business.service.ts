import apiClient from '../lib/api-client';
import type { ApiResponse, Session, Tokens } from '../types/auth';
import type { BusinessAssignableRole, BusinessMember, BusinessWithRole, CreateBusinessInput } from '../types/business';

interface CreateBusinessResponse {
  business: BusinessWithRole;
  session: Session;
  tokens: Tokens;
}

function transformBusiness(business: BusinessWithRole & { user_role?: BusinessWithRole["role"] }): BusinessWithRole {
  return {
    ...business,
    role: business.user_role ?? business.role,
  };
}

export const businessService = {
  async listBusinesses(): Promise<BusinessWithRole[]> {
    const response = await apiClient.get<ApiResponse<Array<BusinessWithRole & { user_role?: BusinessWithRole["role"] }>>>('/api/v1/businesses');
    return response.data.data.map(transformBusiness);
  },

  async getBusiness(business_id: string): Promise<BusinessWithRole> {
    const response = await apiClient.get<ApiResponse<BusinessWithRole & { user_role?: BusinessWithRole["role"] }>>(`/api/v1/businesses/${business_id}`);
    return transformBusiness(response.data.data);
  },

  async createBusiness(payload: CreateBusinessInput): Promise<CreateBusinessResponse> {
    const response = await apiClient.post<ApiResponse<CreateBusinessResponse>>('/api/v1/businesses', payload);
    return {
      ...response.data.data,
      business: transformBusiness(response.data.data.business),
    };
  },

  async updateBusiness(business_id: string, payload: Partial<CreateBusinessInput>): Promise<BusinessWithRole> {
    const response = await apiClient.patch<ApiResponse<BusinessWithRole & { user_role?: BusinessWithRole["role"] }>>(`/api/v1/businesses/${business_id}`, payload);
    return transformBusiness(response.data.data);
  },

  async listBusinessMembers(business_id: string): Promise<BusinessMember[]> {
    const response = await apiClient.get<ApiResponse<BusinessMember[]>>(`/api/v1/businesses/${business_id}/members`);
    return response.data.data;
  },

  async inviteBusinessMember(
    business_id: string,
    payload: { email: string; role: BusinessAssignableRole }
  ): Promise<void> {
    await apiClient.post(`/api/v1/businesses/${business_id}/members/invite`, payload);
  },

  async updateBusinessMemberRole(
    business_id: string,
    user_id: string,
    role: BusinessAssignableRole
  ): Promise<void> {
    await apiClient.patch(`/api/v1/businesses/${business_id}/members/${user_id}/role`, { role });
  },

  async updateBusinessMemberStatus(
    business_id: string,
    user_id: string,
    is_active: boolean
  ): Promise<void> {
    await apiClient.patch(`/api/v1/businesses/${business_id}/members/${user_id}/status`, { is_active });
  },
};
