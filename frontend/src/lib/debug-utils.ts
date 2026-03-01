/**
 * Debug utilities for development
 * Use these in browser console to inspect state
 */

import { useAuthStore } from "@/store/useAuthStore";
import { useBusinessStore } from "@/store/useBusinessStore";

// Make stores available in browser console for debugging
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  (window as any).debugAuth = () => {
    const state = useAuthStore.getState();
    console.log("=== Auth Store ===");
    console.log("User:", state.user);
    console.log("Is Authenticated:", state.isAuthenticated);
    console.log("Tokens:", state.tokens ? "Present" : "Missing");
    console.log("Session:", state.session);
    return state;
  };

  (window as any).debugBusiness = () => {
    const state = useBusinessStore.getState();
    console.log("=== Business Store ===");
    console.log("Businesses:", state.businesses);
    console.log("Current Business:", state.currentBusiness);
    console.log("Is Loading:", state.isLoading);
    return state;
  };

  (window as any).debugAll = () => {
    console.log("=== Full Debug Info ===");
    (window as any).debugAuth();
    (window as any).debugBusiness();
    
    // Check localStorage
    console.log("\n=== LocalStorage ===");
    console.log("auth-storage:", localStorage.getItem("auth-storage"));
    console.log("business-storage:", localStorage.getItem("business-storage"));
  };

  (window as any).clearAllStores = () => {
    console.log("Clearing all stores...");
    useAuthStore.getState().clearAuth();
    useBusinessStore.getState().clearBusinesses();
    
    // Also reset fetch state
    const { resetBusinessesFetchState } = require("@/hooks/use-businesses");
    resetBusinessesFetchState();
    
    console.log("Stores cleared!");
  };

  (window as any).resetBusinessFetch = () => {
    console.log("Resetting business fetch state...");
    const { resetBusinessesFetchState } = require("@/hooks/use-businesses");
    resetBusinessesFetchState();
    console.log("Business fetch state reset!");
  };

  console.log("🔧 Debug utilities loaded!");
  console.log("Available commands:");
  console.log("  - debugAuth() - Show auth store state");
  console.log("  - debugBusiness() - Show business store state");
  console.log("  - debugAll() - Show all debug info");
  console.log("  - clearAllStores() - Clear all stores");
  console.log("  - resetBusinessFetch() - Reset business fetch state");
}

export {};
