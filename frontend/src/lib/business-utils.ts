import { useAuthStore } from "@/store/useAuthStore";
import { useBusinessStore } from "@/store/useBusinessStore";
import { scheduleTokenRefresh } from "@/lib/token-manager";
import type { Session, Tokens } from "@/types/auth";
import type { BusinessWithRole } from "@/types/business";

// Helper for dev-only logging
const devLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV === "development") {
    console.log(...args);
  }
};

/**
 * Update tokens and session after business context change
 * Used when switching businesses or creating new business
 */
export function updateBusinessContext(
  tokens: Tokens,
  session: Session,
  business?: BusinessWithRole
) {
  const { setTokens, setSession } = useAuthStore.getState();
  const { setCurrentBusiness } = useBusinessStore.getState();

  setTokens(tokens);

  // Update session
  setSession(session);
  
  // Update current business if provided
  if (business) {
    setCurrentBusiness(business);
  }
  
  // Reschedule token refresh with new tokens
  scheduleTokenRefresh();
}

/**
 * Clear all business data from localStorage
 * Useful for debugging or forcing a fresh fetch
 */
export function clearBusinessCache() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("business-storage");
    devLog("[BusinessUtils] Business cache cleared");
  }
}

/**
 * Check if business data needs migration
 * Returns true if cached data is missing the role field
 */
export function needsBusinessDataMigration(): boolean {
  if (typeof window === "undefined") return false;
  
  try {
    const cached = localStorage.getItem("business-storage");
    if (!cached) return false;
    
    const data = JSON.parse(cached);
    const state = data?.state;
    
    // Check if currentBusiness exists but doesn't have role
    if (state?.currentBusiness && !state.currentBusiness.role) {
      devLog("[BusinessUtils] Business data needs migration - missing role field");
      return true;
    }
    
    // Check if any business in the list is missing role
    if (state?.businesses?.length > 0) {
      const missingRole = state.businesses.some((b: { role?: unknown }) => !b.role);
      if (missingRole) {
        devLog("[BusinessUtils] Business data needs migration - some businesses missing role");
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error("[BusinessUtils] Error checking migration:", error);
    return false;
  }
}
