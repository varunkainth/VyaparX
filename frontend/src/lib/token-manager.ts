import { useAuthStore } from "@/store/useAuthStore";
import { authService } from "@/services/auth.service";

// Helper for dev-only logging
const devLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV === "development") {
    console.log(...args);
  }
};

let refreshTimer: NodeJS.Timeout | null = null;

// Schedule token refresh before expiration
export function scheduleTokenRefresh() {
  devLog("[TokenManager] Scheduled refresh disabled - API client handles refresh automatically");
  return;
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
  scheduleTokenRefresh();
  return true;
}
