import { useAuthStore } from "@/store/useAuthStore";
import { authService } from "@/services/auth.service";

// Helper for dev-only logging
const devLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV === "development") {
    console.log(...args);
  }
};

let refreshTimer: NodeJS.Timeout | null = null;

const REFRESH_BUFFER_MS = 60 * 1000;

function getTokenExpiry(accessToken: string): number | null {
  try {
    const [, payload] = accessToken.split(".");
    if (!payload) return null;

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const decoded = JSON.parse(atob(padded)) as { exp?: number };

    return decoded.exp ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

async function performRefresh(): Promise<boolean> {
  const { tokens, setTokens, clearAuth } = useAuthStore.getState();

  if (!tokens?.refreshToken) {
    clearAuth();
    return false;
  }

  try {
    const newTokens = await authService.refreshToken(tokens.refreshToken);
    setTokens(newTokens);
    scheduleTokenRefresh();
    return true;
  } catch (error) {
    devLog("[TokenManager] Scheduled refresh failed", error);
    clearAuth();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return false;
  }
}

// Schedule token refresh before expiration
export function scheduleTokenRefresh() {
  cancelTokenRefresh();

  const { tokens } = useAuthStore.getState();
  if (!tokens?.accessToken || !tokens?.refreshToken) {
    return;
  }

  const expiryTime = getTokenExpiry(tokens.accessToken);
  if (!expiryTime) {
    devLog("[TokenManager] Could not decode access token expiry");
    return;
  }

  const refreshInMs = Math.max(expiryTime - Date.now() - REFRESH_BUFFER_MS, 0);
  devLog("[TokenManager] Scheduling token refresh", {
    refreshInMs,
    expiresAt: new Date(expiryTime).toISOString(),
  });

  refreshTimer = setTimeout(() => {
    void performRefresh();
  }, refreshInMs);
}

// Cancel scheduled token refresh
export function cancelTokenRefresh() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

// Check and refresh token if needed (call this on app mount or route change)
export async function checkAndRefreshToken(): Promise<boolean> {
  const { tokens } = useAuthStore.getState();
  if (!tokens?.accessToken || !tokens?.refreshToken) {
    return false;
  }

  const expiryTime = getTokenExpiry(tokens.accessToken);
  if (expiryTime && expiryTime - Date.now() <= REFRESH_BUFFER_MS) {
    return performRefresh();
  }

  scheduleTokenRefresh();
  return true;
}
