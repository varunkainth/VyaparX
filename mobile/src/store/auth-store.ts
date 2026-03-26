import { create } from "zustand";

import { clearAuthSnapshot, persistAuthSnapshot } from "../lib/auth-storage";
import type { AuthSnapshot, AuthState, Session, Tokens, User } from "../types/auth";

interface AuthActions {
  clearAuth: () => Promise<void>;
  markHydrated: () => void;
  restoreAuth: (snapshot: AuthSnapshot | null) => void;
  setAuth: (user: User, tokens: Tokens, session: Session) => void;
  setLoading: (isLoading: boolean) => void;
  setSession: (session: Session) => void;
  setTokens: (tokens: Tokens) => void;
  setUser: (user: User) => void;
}

const initialState: AuthState = {
  hasHydrated: false,
  isAuthenticated: false,
  isLoading: false,
  session: null,
  tokens: null,
  user: null,
};

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  ...initialState,

  restoreAuth: (snapshot) => {
    set({
      user: snapshot?.user ?? null,
      tokens: snapshot?.tokens ?? null,
      session: snapshot?.session ?? null,
      isAuthenticated: !!snapshot?.tokens,
    });
  },

  setAuth: (user, tokens, session) => {
    const snapshot: AuthSnapshot = { user, tokens, session };

    set({
      user,
      tokens,
      session,
      isAuthenticated: true,
    });

    void persistAuthSnapshot(snapshot);
  },

  setTokens: (tokens) => {
    const { user, session } = get();
    const snapshot: AuthSnapshot = {
      user,
      tokens,
      session,
    };

    set({
      tokens,
      isAuthenticated: true,
    });

    void persistAuthSnapshot(snapshot);
  },

  setSession: (session) => {
    const { user, tokens } = get();
    const snapshot: AuthSnapshot = {
      user,
      tokens,
      session,
    };

    set({ session });
    void persistAuthSnapshot(snapshot);
  },

  setUser: (user) => {
    const { session, tokens } = get();
    const snapshot: AuthSnapshot = {
      user,
      tokens,
      session,
    };

    set({ user });
    void persistAuthSnapshot(snapshot);
  },

  setLoading: (isLoading) => {
    set({ isLoading });
  },

  markHydrated: () => {
    set({ hasHydrated: true });
  },

  clearAuth: async () => {
    await clearAuthSnapshot();
    set({
      ...initialState,
      hasHydrated: true,
    });
  },
}));
