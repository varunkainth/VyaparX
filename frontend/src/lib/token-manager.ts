// Helper for dev-only logging
const devLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV === "development") {
    console.log(...args);
  }
};

let refreshTimer: NodeJS.Timeout | null = null;

// Schedule token refresh before expiration
export function scheduleTokenRefresh() {
  devLog("[TokenManager] Cookie-based auth enabled; refresh handled on 401");
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
  scheduleTokenRefresh();
  return true;
}
