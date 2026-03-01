import { useAuthStore } from "@/store/useAuthStore";
import { useBusinessStore } from "@/store/useBusinessStore";
import { scheduleTokenRefresh } from "@/lib/token-manager";
import type { Tokens, Session } from "@/types/auth";
import type { BusinessWithRole } from "@/types/business";

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

  // Update tokens
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
    console.log("[BusinessUtils] Business cache cleared");
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
      console.log("[BusinessUtils] Business data needs migration - missing role field");
      return true;
    }
    
    // Check if any business in the list is missing role
    if (state?.businesses?.length > 0) {
      const missingRole = state.businesses.some((b: any) => !b.role);
      if (missingRole) {
        console.log("[BusinessUtils] Business data needs migration - some businesses missing role");
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error("[BusinessUtils] Error checking migration:", error);
    return false;
  }
}
