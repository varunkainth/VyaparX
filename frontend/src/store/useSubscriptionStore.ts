import { create } from "zustand";
import { subscriptionService } from "@/services/subscription.service";
import type { SubscriptionStatus } from "@/types/subscription";

export type SubscriptionPlan = "free" | "pro";

export type SubscriptionStatusSummary = {
  plan: SubscriptionPlan;
  status: SubscriptionStatus["status"] | null;
  trial_ends_at: string | null;
};

export interface SubscriptionStore {
  status: SubscriptionStatus | null;
  plan: SubscriptionPlan;
  billingStatus: SubscriptionStatus["status"] | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  billingCycle: SubscriptionStatus["billing_cycle"];
  loadedUserId: string | null;
  isLoading: boolean;
  isPolling: boolean;
  hasLoaded: boolean;
  setStatus: (status: SubscriptionStatus | null) => void;
  setLoading: (isLoading: boolean) => void;
  setPolling: (isPolling: boolean) => void;
  refreshStatus: () => Promise<SubscriptionStatus | null>;
  refreshForUser: (userId: string) => Promise<SubscriptionStatus | null>;
  clearSubscription: () => void;
}

export const useSubscriptionStore = create<SubscriptionStore>()((set, get) => ({
  status: null,
  plan: "free",
  billingStatus: null,
  trialEndsAt: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  billingCycle: null,
  loadedUserId: null,
  isLoading: false,
  isPolling: false,
  hasLoaded: false,
  setStatus: (status) =>
    set({
      status,
      plan: status?.plan ?? "free",
      billingStatus: status?.status ?? null,
      trialEndsAt: status?.trial_ends_at ?? null,
      currentPeriodEnd: status?.current_period_end ?? null,
      cancelAtPeriodEnd: status?.cancel_at_period_end ?? false,
      billingCycle: status?.billing_cycle ?? null,
      hasLoaded: true,
    }),
  setLoading: (isLoading) => set({ isLoading }),
  setPolling: (isPolling) => set({ isPolling }),
  refreshStatus: async () => {
    set({ isLoading: true });
    try {
      const status = await subscriptionService.getStatus();
      set((state) => ({
        status,
        plan: status?.plan ?? "free",
        billingStatus: status?.status ?? null,
        trialEndsAt: status?.trial_ends_at ?? null,
        currentPeriodEnd: status?.current_period_end ?? null,
        cancelAtPeriodEnd: status?.cancel_at_period_end ?? false,
        billingCycle: status?.billing_cycle ?? null,
        hasLoaded: true,
      }));
      return status;
    } finally {
      set({ isLoading: false });
    }
  },
  refreshForUser: async (userId) => {
    const current = get();
    if (current.loadedUserId === userId && current.hasLoaded) {
      return current.status;
    }

    const status = await current.refreshStatus();
    set({ loadedUserId: userId });
    return status;
  },
  clearSubscription: () => set({
    status: null,
    plan: "free",
    billingStatus: null,
    trialEndsAt: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    billingCycle: null,
    loadedUserId: null,
    isLoading: false,
    isPolling: false,
    hasLoaded: false,
  }),
}));

export const getSubscriptionSummary = (
  state: Pick<SubscriptionStore, "plan" | "billingStatus" | "trialEndsAt">
): SubscriptionStatusSummary => ({
  plan: state.plan,
  status: state.billingStatus,
  trial_ends_at: state.trialEndsAt,
});
