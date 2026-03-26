import apiClient from '../lib/api-client';
import type { ApiResponse, Session, Tokens } from '../types/auth';
import type { BusinessWithRole, CreateBusinessInput } from '../types/business';

interface CreateBusinessResponse {
  business: BusinessWithRole;
  session: Session;
  tokens: Tokens;
}

export const businessService = {
  async listBusinesses(): Promise<BusinessWithRole[]> {
    const response = await apiClient.get<ApiResponse<BusinessWithRole[]>>('/api/v1/businesses');
    return response.data.data;
  },

  async createBusiness(payload: CreateBusinessInput): Promise<CreateBusinessResponse> {
    const response = await apiClient.post<ApiResponse<CreateBusinessResponse>>('/api/v1/businesses', payload);
    return response.data.data;
  },
};
