import { AppState, type AppStateStatus } from "react-native";
import { useEffect } from "react";

import { restoreAuthSnapshot } from "../lib/auth-storage";
import { refreshSession } from "../lib/session";
import { authService } from "../services/auth.service";
import { useAuthStore } from "../store/auth-store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const {
    hasHydrated,
    markHydrated,
    restoreAuth,
    setAuth,
    setLoading,
    clearAuth,
  } = useAuthStore();

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      setLoading(true);

      try {
        const snapshot = await restoreAuthSnapshot();
        if (!isMounted) return;

        restoreAuth(snapshot);

        if (!snapshot?.tokens?.refreshToken) {
          markHydrated();
          return;
        }

        const refreshedTokens = await refreshSession();
        if (!isMounted || !refreshedTokens) {
          await clearAuth();
          return;
        }

        const response = await authService.getMe();
        if (!isMounted) return;

        setAuth(response.user, refreshedTokens, response.session);
      } catch {
        if (!isMounted) return;
        await clearAuth();
      } finally {
        if (!isMounted) return;
        markHydrated();
        setLoading(false);
      }
    };

    if (!hasHydrated) {
      void bootstrap();
    }

    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (nextState === "active" && useAuthStore.getState().isAuthenticated) {
        void refreshSession();
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [clearAuth, hasHydrated, markHydrated, restoreAuth, setAuth, setLoading]);

  return children;
}
