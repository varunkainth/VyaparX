import apiClient from "../lib/api-client";
import type { PasskeyCreateRequest, PasskeyCreateResult, PasskeyGetRequest, PasskeyGetResult } from "react-native-passkey";
import type {
  ApiResponse,
  AuthResponse,
  LoginInput,
  MeResponse,
  Session,
  SignupInput,
  Tokens,
  User,
} from "../types/auth";

interface SwitchBusinessResponse {
  session: Session;
  tokens: Tokens;
}

interface PasskeyOptionsResponse<T> {
  options: T;
}

interface UpdateProfileInput {
  email?: string;
  name?: string;
  phone?: string;
}

export interface PasskeyCredential {
  created_at: string;
  credential_backed_up: boolean;
  credential_device_type: string;
  credential_id: string;
  label: string;
  last_used_at: string | null;
  transports: string[];
}

export const authService = {
  async login(payload: LoginInput): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>("/auth/login", payload);
    return response.data.data;
  },

  async signup(payload: SignupInput): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>("/auth/signup", payload);
    return response.data.data;
  },

  async getMe(): Promise<MeResponse> {
    const response = await apiClient.get<ApiResponse<MeResponse>>("/auth/me");
    return response.data.data;
  },

  async updateMe(payload: UpdateProfileInput): Promise<User> {
    const response = await apiClient.patch<ApiResponse<{ user: User }>>("/auth/me", payload);
    return response.data.data.user;
  },

  async changePassword(payload: { currentPassword: string; newPassword: string }): Promise<void> {
    await apiClient.post("/auth/change-password", payload);
  },

  async forgotPassword(email: string): Promise<void> {
    await apiClient.post("/auth/forgot-password", { email });
  },

  async verifyResetToken(token: string): Promise<void> {
    await apiClient.post("/auth/verify-reset-token", { token });
  },

  async resetPassword(payload: { new_password: string; token: string }): Promise<void> {
    await apiClient.post("/auth/reset-password", payload);
  },

  async sendVerificationEmail(email: string): Promise<void> {
    await apiClient.post("/auth/send-verification-email", { email });
  },

  async verifyEmail(token: string): Promise<void> {
    await apiClient.post("/auth/verify-email", { token });
  },

  async resendVerificationEmail(): Promise<void> {
    await apiClient.post("/auth/resend-verification-email");
  },

  async listPasskeys(): Promise<PasskeyCredential[]> {
    const response = await apiClient.get<ApiResponse<PasskeyCredential[]>>("/auth/passkeys");
    return response.data.data;
  },

  async deletePasskey(credential_id: string): Promise<void> {
    await apiClient.delete(`/auth/passkeys/${credential_id}`);
  },

  async beginPasskeyLogin(identifier: string): Promise<PasskeyGetRequest> {
    const response = await apiClient.post<ApiResponse<PasskeyOptionsResponse<PasskeyGetRequest>>>(
      "/auth/passkeys/login/options",
      { identifier }
    );
    return response.data.data.options;
  },

  async verifyPasskeyLogin(payload: {
    business_id?: string;
    identifier: string;
    response: PasskeyGetResult;
  }): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>("/auth/passkeys/login/verify", payload);
    return response.data.data;
  },

  async beginPasskeyRegistration(): Promise<PasskeyCreateRequest> {
    const response = await apiClient.post<ApiResponse<PasskeyOptionsResponse<PasskeyCreateRequest>>>(
      "/auth/passkeys/register/options"
    );
    return response.data.data.options;
  },

  async verifyPasskeyRegistration(payload: {
    label?: string;
    response: PasskeyCreateResult;
  }): Promise<PasskeyCredential> {
    const response = await apiClient.post<ApiResponse<{ credential: PasskeyCredential }>>(
      "/auth/passkeys/register/verify",
      payload
    );
    return response.data.data.credential;
  },

  async switchBusiness(business_id: string): Promise<SwitchBusinessResponse> {
    const response = await apiClient.post<ApiResponse<SwitchBusinessResponse>>("/auth/switch-business", {
      business_id,
    });
    return response.data.data;
  },

  async logout(): Promise<void> {
    await apiClient.post("/auth/logout");
  },
};
