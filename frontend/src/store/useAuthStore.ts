import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuthState, User, Session, Tokens } from "@/types/auth";

interface AuthActions {
  setAuth: (user: User, tokens: Tokens, session?: Session) => void;
  setUser: (user: User) => void;
  setTokens: (tokens: Tokens) => void;
  setSession: (session: Session) => void;
  clearAuth: () => void;
  setLoading: (isLoading: boolean) => void;
  setHydrated: () => void;
}

const initialState: AuthState = {
  user: null,
  tokens: null,
  session: null,
  isAuthenticated: false,
  isLoading: false,
};

export const useAuthStore = create<AuthState & AuthActions & { _hasHydrated: boolean }>()(
  persist(
    (set) => ({
      ...initialState,
      _hasHydrated: false,

      setAuth: (user, tokens, session) =>
        set(() => {
          console.log("[AuthDebug] setAuth called", {
            userId: user.id,
            hasAccessToken: !!tokens?.accessToken,
            hasRefreshToken: !!tokens?.refreshToken,
            sessionBusinessId: session?.business_id ?? null,
          });
          return {
            user,
            tokens,
            session: session || null,
            isAuthenticated: true,
          };
        }),

      setUser: (user) =>
        set((state) => ({
          user,
          isAuthenticated: !!user,
          tokens: state.tokens,
        })),

      setTokens: (tokens) =>
        set(() => {
          console.log("[AuthDebug] setTokens called", {
            hasAccessToken: !!tokens?.accessToken,
            hasRefreshToken: !!tokens?.refreshToken,
          });
          return {
            tokens,
          };
        }),

      setSession: (session) =>
        set((state) => ({
          session,
          isAuthenticated: !!state.tokens || !!state.user,
        })),

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

      setHydrated: () =>
        set({
          _hasHydrated: true,
        }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        session: state.session,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        console.log("[AuthDebug] auth store rehydrated", {
          hasAccessToken: !!state?.tokens?.accessToken,
          hasRefreshToken: !!state?.tokens?.refreshToken,
          userId: state?.user?.id ?? null,
          isAuthenticated: state?.isAuthenticated ?? false,
        });
        state?.setHydrated();
      },
    }
  )
);
