import { create } from "zustand";

type NavigationState = {
  currentRoute: string | null;
  lastRoute: string | null;
  setCurrentRoute: (route: string) => void;
};

export const useNavigationStore = create<NavigationState>((set, get) => ({
  currentRoute: null,
  lastRoute: null,
  setCurrentRoute: (route) => {
    const { currentRoute, lastRoute } = get();

    if (!route || route === currentRoute) {
      return;
    }

    set({
      currentRoute: route,
      lastRoute: currentRoute ?? lastRoute,
    });
  },
}));
