"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useSubscriptionStore, type SubscriptionStore } from "@/store/useSubscriptionStore";

export function SubscriptionPlanHydrator() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const refreshForUser = useSubscriptionStore((state: SubscriptionStore) => state.refreshForUser);
  const clearSubscription = useSubscriptionStore((state: SubscriptionStore) => state.clearSubscription);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      clearSubscription();
      return;
    }

    void refreshForUser(user.id);
  }, [clearSubscription, isAuthenticated, refreshForUser, user?.id]);

  return null;
}
