import apiClient from "@/lib/api-client";
import type {
  LoginInput,
  SignupInput,
  UpdateProfileInput,
  ChangePasswordInput,
  SwitchBusinessInput,
  User,
  Tokens,
  Session,
} from "@/types/auth";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface AuthResponse {
  user: User;
  tokens: Tokens;
}

interface MeResponse {
  user: User;
  session: Session;
}

interface SwitchBusinessResponse {
  session: Session;
  tokens: Tokens;
}

export const authService = {
  async signup(data: SignupInput): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      "/auth/signup",
      data
    );
    return response.data.data;
  },

  async login(data: LoginInput): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      "/auth/login",
      data
    );
    return response.data.data;
  },

  async refreshToken(refreshToken: string): Promise<Tokens> {
    const response = await apiClient.post<ApiResponse<{ tokens: Tokens }>>(
      "/auth/refresh",
      {},
      {
        headers: {
          Authorization: `Bearer ${refreshToken}`,
        },
      }
    );
    return response.data.data.tokens;
  },

  async getMe(): Promise<MeResponse> {
    const response = await apiClient.get<ApiResponse<MeResponse>>("/auth/me");
    return response.data.data;
  },

  async updateProfile(data: UpdateProfileInput): Promise<User> {
    const response = await apiClient.patch<ApiResponse<{ user: User }>>(
      "/auth/me",
      data
    );
    return response.data.data.user;
  },

  async changePassword(data: ChangePasswordInput): Promise<void> {
    await apiClient.post("/auth/change-password", data);
  },

  async switchBusiness(data: SwitchBusinessInput): Promise<SwitchBusinessResponse> {
    const response = await apiClient.post<ApiResponse<SwitchBusinessResponse>>(
      "/auth/switch-business",
      data
    );
    return response.data.data;
  },

  async logout(): Promise<void> {
    await apiClient.post("/auth/logout");
  },

  async forgotPassword(email: string): Promise<{ email: string }> {
    const response = await apiClient.post<ApiResponse<{ email: string }>>(
      "/api/v1/auth/forgot-password",
      { email }
    );
    return response.data.data;
  },

  async verifyResetToken(token: string): Promise<{ email: string; name: string }> {
    const response = await apiClient.post<ApiResponse<{ email: string; name: string }>>(
      "/api/v1/auth/verify-reset-token",
      { token }
    );
    return response.data.data;
  },

  async resetPassword(token: string, newPassword: string): Promise<{ email: string }> {
    const response = await apiClient.post<ApiResponse<{ email: string }>>(
      "/api/v1/auth/reset-password",
      { token, new_password: newPassword }
    );
    return response.data.data;
  },

  async sendVerificationEmail(email: string): Promise<{ email: string }> {
    const response = await apiClient.post<ApiResponse<{ email: string }>>(
      "/api/v1/auth/send-verification-email",
      { email }
    );
    return response.data.data;
  },

  async verifyEmail(token: string): Promise<{ email: string; name: string }> {
    const response = await apiClient.post<ApiResponse<{ email: string; name: string }>>(
      "/api/v1/auth/verify-email",
      { token }
    );
    return response.data.data;
  },

  async resendVerificationEmail(): Promise<{ email: string }> {
    const response = await apiClient.post<ApiResponse<{ email: string }>>(
      "/api/v1/auth/resend-verification-email"
    );
    return response.data.data;
  },
};
