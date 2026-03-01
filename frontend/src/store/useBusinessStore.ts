import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BusinessState, BusinessWithRole } from "@/types/business";

interface BusinessActions {
  setBusinesses: (businesses: BusinessWithRole[]) => void;
  setCurrentBusiness: (business: BusinessWithRole | null) => void;
  addBusiness: (business: BusinessWithRole) => void;
  updateBusiness: (businessId: string, updates: Partial<BusinessWithRole>) => void;
  removeBusiness: (businessId: string) => void;
  clearBusinesses: () => void;
  setLoading: (isLoading: boolean) => void;
  resetFetchFlag: () => void; // Helper to reset fetch state
}

const initialState: BusinessState = {
  businesses: [],
  currentBusiness: null,
  isLoading: false,
};

// Storage version for migrations
const STORAGE_VERSION = 2; // Increment when schema changes

export const useBusinessStore = create<BusinessState & BusinessActions>()(
  persist(
    (set) => ({
      ...initialState,

      setBusinesses: (businesses) =>
        set({
          businesses,
        }),

      setCurrentBusiness: (business) =>
        set({
          currentBusiness: business,
        }),

      addBusiness: (business) =>
        set((state) => ({
          businesses: [...state.businesses, business],
        })),

      updateBusiness: (businessId, updates) =>
        set((state) => ({
          businesses: state.businesses.map((b) =>
            b.id === businessId ? { ...b, ...updates } : b
          ),
          currentBusiness:
            state.currentBusiness?.id === businessId
              ? { ...state.currentBusiness, ...updates }
              : state.currentBusiness,
        })),

      removeBusiness: (businessId) =>
        set((state) => ({
          businesses: state.businesses.filter((b) => b.id !== businessId),
          currentBusiness:
            state.currentBusiness?.id === businessId
              ? null
              : state.currentBusiness,
        })),

      clearBusinesses: () =>
        set({
          ...initialState,
        }),

      setLoading: (isLoading) =>
        set({
          isLoading,
        }),

      resetFetchFlag: () => {
        // Helper to reset the global fetch flag if needed
        // This is useful for debugging or forcing a refetch
        if (typeof window !== "undefined") {
          (window as any).__businessFetchFlag = false;
        }
      },
    }),
    {
      name: "business-storage",
      version: STORAGE_VERSION,
      partialize: (state) => ({
        businesses: state.businesses,
        currentBusiness: state.currentBusiness,
      }),
      migrate: (persistedState: any, version: number) => {
        // If version is less than 2, clear the data to force refetch with role field
        if (version < 2) {
          console.log("[BusinessStore] Migrating from version", version, "to", STORAGE_VERSION);
          return initialState;
        }
        return persistedState;
      },
    }
  )
);
