"use client";

import { useEffect, useCallback } from "react";
import { useBusinessStore } from "@/store/useBusinessStore";
import { useAuthStore } from "@/store/useAuthStore";
import { businessService } from "@/services/business.service";
import { authService } from "@/services/auth.service";
import { getErrorMessage } from "@/lib/error-handler";
import { updateBusinessContext } from "@/lib/business-utils";

// Helper for dev-only logging
const devLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV === "development") {
    console.log(...args);
  }
};

// Global state to track if businesses have been fetched
let hasInitiallyFetched = false;
let isFetchingBusinesses = false;

// Global state to track if we've shown the empty business modal
let hasShownEmptyBusinessModal = false;

/**
 * Hook to fetch and sync businesses from API
 * Only fetches once per session when authenticated
 */
export function useBusinesses(options?: { forceRefetch?: boolean }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const businesses = useBusinessStore((state) => state.businesses);
  const isLoading = useBusinessStore((state) => state.isLoading);

  const fetchBusinesses = useCallback(
    async (force = false) => {
      // Multiple guards to prevent unnecessary fetches
      if (!isAuthenticated) return;
      if (!force && hasInitiallyFetched) return;
      if (isFetchingBusinesses) return;
      if (!force && businesses.length > 0) return; // Already have data

      try {
        isFetchingBusinesses = true;
        hasInitiallyFetched = true;

        const { setLoading, setBusinesses } = useBusinessStore.getState();
        setLoading(true);

        devLog("[useBusinesses] Fetching businesses from API...");
        const data = await businessService.listBusinesses();
        devLog(
          "[useBusinesses] Businesses fetched:",
          data.length,
          "businesses",
        );
        devLog("[useBusinesses] First business role:", data[0]?.role);

        setBusinesses(data);

        // Check if user has no businesses and hasn't been shown the modal yet
        if (data.length === 0 && !hasShownEmptyBusinessModal) {
          devLog(
            "[useBusinesses] User has no businesses, should show creation modal",
          );
          hasShownEmptyBusinessModal = true;
          // This will be handled by the AuthGuard component
        }

        // Auto-select first business if none selected and switch business context
        const currentBusiness = useBusinessStore.getState().currentBusiness;
        if (data.length > 0 && !currentBusiness) {
          devLog(
            "[useBusinesses] Auto-selecting first business:",
            data[0].name,
          );
          try {
            // Call switch business to update the server-backed session context
            const response = await authService.switchBusiness({
              business_id: data[0].id,
            });
            updateBusinessContext(response.tokens, response.session, data[0]);
            devLog("[useBusinesses] Business context updated");
          } catch (switchError) {
            console.error(
              "[useBusinesses] Failed to switch business:",
              switchError,
            );
            // Fallback: just set the business without switching
            useBusinessStore.getState().setCurrentBusiness(data[0]);
          }
        } else if (data.length > 0 && currentBusiness) {
          // Update current business with fresh data (including role)
          const updatedCurrent = data.find((b) => b.id === currentBusiness.id);
          if (updatedCurrent) {
            devLog("[useBusinesses] Updating current business with fresh data");
            useBusinessStore.getState().setCurrentBusiness(updatedCurrent);
          }
        }
      } catch (error) {
        console.error("[useBusinesses] Failed to fetch businesses:", error);
        const errorMessage = getErrorMessage(error);
        console.error("[useBusinesses] Error details:", errorMessage);

        // Reset flags on error to allow retry
        hasInitiallyFetched = false;
        hasShownEmptyBusinessModal = false; // Allow retry on error
      } finally {
        const { setLoading } = useBusinessStore.getState();
        setLoading(false);
        isFetchingBusinesses = false;
      }
    },
    [isAuthenticated, businesses.length],
  );

  useEffect(() => {
    fetchBusinesses(options?.forceRefetch);
  }, [fetchBusinesses, options?.forceRefetch]);

  return {
    businesses,
    isLoading,
    refetch: () => fetchBusinesses(true),
  };
}

/**
 * Reset the fetch state - useful for testing or after logout
 */
export function resetBusinessesFetchState() {
  hasInitiallyFetched = false;
  isFetchingBusinesses = false;
  hasShownEmptyBusinessModal = false;
  devLog("[useBusinesses] Fetch state reset");
}
