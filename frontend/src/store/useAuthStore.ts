import { create } from "zustand";
import type { AuthState, User, Session } from "@/types/auth";

interface AuthActions {
  setAuth: (user: User, session?: Session) => void;
  setUser: (user: User) => void;
  setSession: (session: Session) => void;
  clearAuth: () => void;
  setLoading: (isLoading: boolean) => void;
}

const initialState: AuthState = {
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: false,
};

export const useAuthStore = create<AuthState & AuthActions & { _hasHydrated: boolean }>()((set) => ({
  ...initialState,
  _hasHydrated: true,

  setAuth: (user, session) =>
    set({
      user,
      session: session || null,
      isAuthenticated: true,
    }),

  setUser: (user) =>
    set({
      user,
      isAuthenticated: true,
    }),

  setSession: (session) =>
    set({
      session,
      isAuthenticated: true,
    }),

  clearAuth: () => {
    console.log("[AuthStore] Clearing auth - called from:", new Error().stack?.split("\n")[2]);

    const { clearBusinesses } = require("@/store/useBusinessStore").useBusinessStore.getState();
    clearBusinesses();

    const { resetBusinessesFetchState } = require("@/hooks/use-businesses");
    resetBusinessesFetchState();

    set({
      ...initialState,
      _hasHydrated: true,
    });
  },

  setLoading: (isLoading) =>
    set({
      isLoading,
    }),
}));
