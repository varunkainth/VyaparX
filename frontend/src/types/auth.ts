export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  is_verified: boolean;
  token_version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface Session {
  business_id: string | null;
  role: "owner" | "admin" | "staff" | "viewer" | "accountant" | null;
}

export interface AuthState {
  user: User | null;
  tokens: Tokens | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginInput {
  identifier: string;
  password: string;
  business_id?: string;
}

export interface SignupInput {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface UpdateProfileInput {
  name?: string;
  email?: string;
  phone?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface SwitchBusinessInput {
  business_id: string;
}

export interface PasskeyCredential {
  credential_id: string;
  label: string;
  transports: string[];
  credential_device_type: "singleDevice" | "multiDevice";
  credential_backed_up: boolean;
  last_used_at: string | null;
  created_at: string;
}

export interface PasskeyAuthenticationInput {
  identifier: string;
  business_id?: string;
}
