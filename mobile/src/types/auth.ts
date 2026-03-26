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
  hasHydrated: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  session: Session | null;
  tokens: Tokens | null;
  user: User | null;
}

export interface AuthSnapshot {
  session: Session | null;
  tokens: Tokens | null;
  user: User | null;
}

export interface LoginInput {
  identifier: string;
  password: string;
  business_id?: string;
}

export interface SignupInput {
  email: string;
  name: string;
  password: string;
  phone: string;
}

export interface AuthResponse {
  session: Session;
  tokens: Tokens;
  user: User;
}

export interface MeResponse {
  session: Session;
  user: User;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}
