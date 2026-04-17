"use client";

import { useMemo } from "react";
import { BILLING_FEATURES, type BillingFeatureKey } from "@/constants/plan-features";
import { useSubscriptionStore, type SubscriptionStore } from "@/store/useSubscriptionStore";
import { useUpgradeModalStore } from "@/store/useUpgradeModalStore";

export function useFeatureGate(feature: BillingFeatureKey) {
  const plan = useSubscriptionStore((state: SubscriptionStore) => state.plan);
  const status = useSubscriptionStore((state: SubscriptionStore) => state.billingStatus);
  const trialEndsAt = useSubscriptionStore((state: SubscriptionStore) => state.trialEndsAt);
  const openUpgradeModal = useUpgradeModalStore((state) => state.open);

  const allowed = useMemo(() => {
    if (plan === "pro") return true;
    if (status === "trialing" && trialEndsAt) {
      return new Date(trialEndsAt).getTime() > Date.now();
    }
    return false;
  }, [plan, status, trialEndsAt]);

  return {
    allowed,
    upgrade: () =>
      openUpgradeModal({
        feature,
        message: BILLING_FEATURES[feature]?.description ?? null,
        source: "manual",
      }),
    feature: BILLING_FEATURES[feature],
  };
}
