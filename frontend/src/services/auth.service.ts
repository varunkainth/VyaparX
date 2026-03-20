import apiClient from "@/lib/api-client";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";
import type {
  LoginInput,
  PasskeyAuthenticationInput,
  PasskeyCredential,
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
  session: Session;
}

interface MeResponse {
  user: User;
  session: Session;
}

interface SwitchBusinessResponse {
  session: Session;
  tokens: Tokens;
}

const assertTokensPresent = (tokens: Tokens | undefined, operation: string): Tokens => {
  if (!tokens?.accessToken || !tokens?.refreshToken) {
    throw new Error(
      `Backend auth response missing tokens during ${operation}. The backend deployment may be out of date.`
    );
  }
  return tokens;
};

export const authService = {
  async signup(data: SignupInput): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      "/auth/signup",
      data
    );
    return {
      ...response.data.data,
      tokens: assertTokensPresent(response.data.data.tokens, "signup"),
    };
  },

  async login(data: LoginInput): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      "/auth/login",
      data
    );
    return {
      ...response.data.data,
      tokens: assertTokensPresent(response.data.data.tokens, "login"),
    };
  },

  async beginPasskeyLogin(identifier: string): Promise<PublicKeyCredentialRequestOptionsJSON> {
    const response = await apiClient.post<ApiResponse<{ options: PublicKeyCredentialRequestOptionsJSON }>>(
      "/auth/passkeys/login/options",
      { identifier }
    );
    return response.data.data.options;
  },

  async verifyPasskeyLogin(data: {
    identifier: string;
    response: AuthenticationResponseJSON;
    business_id?: string;
  }): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      "/auth/passkeys/login/verify",
      data
    );
    return {
      ...response.data.data,
      tokens: assertTokensPresent(response.data.data.tokens, "passkey-login"),
    };
  },

  async beginPasskeyRegistration(): Promise<PublicKeyCredentialCreationOptionsJSON> {
    const response = await apiClient.post<ApiResponse<{ options: PublicKeyCredentialCreationOptionsJSON }>>(
      "/auth/passkeys/register/options"
    );
    return response.data.data.options;
  },

  async verifyPasskeyRegistration(data: {
    response: RegistrationResponseJSON;
    label?: string;
  }): Promise<PasskeyCredential> {
    const response = await apiClient.post<ApiResponse<{ credential: PasskeyCredential }>>(
      "/auth/passkeys/register/verify",
      data
    );
    return response.data.data.credential;
  },

  async listPasskeys(): Promise<PasskeyCredential[]> {
    const response = await apiClient.get<ApiResponse<PasskeyCredential[]>>("/auth/passkeys");
    return response.data.data;
  },

  async deletePasskey(credentialId: string): Promise<void> {
    await apiClient.delete(`/auth/passkeys/${encodeURIComponent(credentialId)}`);
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
    return {
      ...response.data.data,
      tokens: assertTokensPresent(response.data.data.tokens, "switch-business"),
    };
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
