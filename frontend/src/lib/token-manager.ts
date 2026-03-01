import { useAuthStore } from "@/store/useAuthStore";
import { authService } from "@/services/auth.service";

// Decode JWT without verification (just to read payload)
function decodeJWT(token: string): any {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Failed to decode JWT:", error);
    return null;
  }
}

// Get token expiration time in milliseconds
function getTokenExpiration(token: string): number | null {
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return null;
  return decoded.exp * 1000; // Convert to milliseconds
}

// Check if token is expired or about to expire (within 5 minutes)
function isTokenExpiringSoon(token: string, bufferMinutes: number = 5): boolean {
  const expiration = getTokenExpiration(token);
  if (!expiration) return true;
  
  const now = Date.now();
  const bufferMs = bufferMinutes * 60 * 1000;
  return expiration - now < bufferMs;
}

let refreshTimer: NodeJS.Timeout | null = null;

// Schedule token refresh before expiration
export function scheduleTokenRefresh() {
  // DISABLED: Let the API client handle token refresh automatically on 401
  // This prevents duplicate refresh calls
  console.log("[TokenManager] Scheduled refresh disabled - API client handles refresh automatically");
  return;
  
  /* Original implementation commented out
  // Clear existing timer
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  const { tokens, setTokens, clearAuth } = useAuthStore.getState();
  
  if (!tokens?.accessToken || !tokens?.refreshToken) {
    return;
  }

  const expiration = getTokenExpiration(tokens.accessToken);
  if (!expiration) {
    return;
  }

  const now = Date.now();
  const timeUntilExpiry = expiration - now;
  
  // Refresh 5 minutes before expiration, or immediately if already expired
  const refreshTime = Math.max(0, timeUntilExpiry - 5 * 60 * 1000);

  refreshTimer = setTimeout(async () => {
    try {
      const newTokens = await authService.refreshToken(tokens.refreshToken);
      setTokens(newTokens);
      
      // Schedule next refresh
      scheduleTokenRefresh();
    } catch (error) {
      console.error("Failed to refresh token:", error);
      clearAuth();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  }, refreshTime);
  */
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

  // Just schedule the refresh timer, don't proactively refresh
  // Let the API client handle 401 errors and refresh automatically
  scheduleTokenRefresh();
  return true;
}
