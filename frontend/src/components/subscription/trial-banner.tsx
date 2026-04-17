"use client";

import { useMemo } from "react";
import { useSubscriptionStore } from "@/store/useSubscriptionStore";
import { useUpgradeModalStore } from "@/store/useUpgradeModalStore";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import type { SubscriptionStore } from "@/store/useSubscriptionStore";

export function TrialBanner() {
  const status = useSubscriptionStore((state: SubscriptionStore) => state.billingStatus);
  const trialEndsAt = useSubscriptionStore((state: SubscriptionStore) => state.trialEndsAt);
  const openUpgradeModal = useUpgradeModalStore((state) => state.open);

  const daysLeft = useMemo(() => {
    if (!trialEndsAt) return null;
    const diff = new Date(trialEndsAt).getTime() - Date.now();
    if (diff <= 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [trialEndsAt]);

  if (status !== "trialing" || daysLeft === null) {
    return null;
  }

  return (
    <div className="sticky top-2 z-40 px-3 sm:px-4">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-3 rounded-2xl border border-amber-300/70 bg-amber-100/95 px-4 py-2 text-sm text-amber-950 shadow-lg backdrop-blur-md dark:border-amber-900/60 dark:bg-amber-950/85 dark:text-amber-50">
        <p className="font-medium leading-none">
          {daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your Pro trial` : "Your Pro trial ends today"}
        </p>
        <Button size="sm" variant="secondary" className="shrink-0" onClick={() => openUpgradeModal({ source: "manual", feature: "billing_history" })}>
          <Sparkles className="h-4 w-4" />
          Upgrade now
        </Button>
      </div>
    </div>
  );
}
