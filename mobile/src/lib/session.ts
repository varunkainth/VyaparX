import axios from "axios";

import { API_BASE_URL, REQUEST_ORIGIN, REQUEST_REFERER } from "./env";
import { useAuthStore } from "../store/auth-store";
import type { ApiResponse, Tokens } from "../types/auth";

let refreshPromise: Promise<Tokens | null> | null = null;

export async function refreshSession(): Promise<Tokens | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const { tokens, setTokens, clearAuth } = useAuthStore.getState();

    if (!tokens?.refreshToken) {
      return null;
    }

    try {
      const response = await axios.post<ApiResponse<{ tokens: Tokens }>>(
        `${API_BASE_URL}/auth/refresh`,
        {},
        {
          headers: {
            Authorization: `Bearer ${tokens.refreshToken}`,
            Origin: REQUEST_ORIGIN,
            Referer: REQUEST_REFERER,
          },
          timeout: 30000,
        }
      );

      const nextTokens = response.data.data.tokens;
      setTokens(nextTokens);
      return nextTokens;
    } catch (error: any) {
      const status = error?.response?.status;

      if (status === 401 || status === 403) {
        await clearAuth();
      }

      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
