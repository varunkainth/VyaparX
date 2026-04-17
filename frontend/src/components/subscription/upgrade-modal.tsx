"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { loadRazorpayScript } from "@/lib/razorpay";
import { subscriptionService } from "@/services/subscription.service";
import { useAuthStore } from "@/store/useAuthStore";
import { useSubscriptionStore } from "@/store/useSubscriptionStore";
import { useUpgradeModalStore } from "@/store/useUpgradeModalStore";
import { BILLING_FEATURES, BILLING_PRICE, formatINR, type BillingFeatureKey } from "@/constants/plan-features";
import { Check, CreditCard, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import type { BillingCycle } from "@/types/subscription";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const FEATURE_ROWS = [
  { label: "Reports", free: "Basic", pro: "Advanced" },
  { label: "Team members", free: "Limited", pro: "Unlimited" },
  { label: "Invoices", free: "Manual", pro: "Recurring + branded" },
  { label: "Support", free: "Standard", pro: "Priority" },
];

const FREE_POINTS = [
  "Core billing and bookkeeping",
  "Single-business workflows",
  "Standard support",
];

const PRO_POINTS = [
  "Advanced reports and analytics",
  "Recurring and branded invoices",
  "Billing history and upgrade workflows",
  "Priority support and team expansion",
];

export function UpgradeModal() {
  const user = useAuthStore((state) => state.user);
  const { isOpen, context, close } = useUpgradeModalStore();
  const { refreshStatus } = useSubscriptionStore();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(context?.billingCycle ?? "monthly");
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const featureKey = context?.feature && context.feature in BILLING_FEATURES
    ? (context.feature as BillingFeatureKey)
    : null;
  const featureLabel = featureKey ? BILLING_FEATURES[featureKey].label : context?.feature;
  const featureDescription = featureKey ? BILLING_FEATURES[featureKey].description : context?.message;

  useEffect(() => {
    if (isOpen && context?.billingCycle) {
      setBillingCycle(context.billingCycle);
    }
  }, [context?.billingCycle, isOpen]);

  const price = billingCycle === "monthly" ? BILLING_PRICE.monthly : BILLING_PRICE.annual;
  const annualSavings = Math.max(0, (BILLING_PRICE.monthly * 12) - BILLING_PRICE.annual);

  const startCheckout = async () => {
    setIsCheckingOut(true);
    try {
      const session = await subscriptionService.createSession({ billing_cycle: billingCycle });
      await loadRazorpayScript();

      if (!window.Razorpay) {
        throw new Error("Razorpay checkout is not available");
      }

      const checkout = new window.Razorpay({
        key: session.razorpay_key,
        subscription_id: session.subscription_id,
        name: "VyaparX",
        description: `Pro ${billingCycle} plan`,
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: user?.phone,
        },
        theme: { color: "#2563eb" },
        handler: () => {
          void refreshStatus();
          toast.success("Payment captured. Refreshing your plan.");
        },
        modal: {
          ondismiss: () => {
            void refreshStatus();
          },
        },
      });

      close();
      checkout.open();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start checkout");
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? undefined : close())}>
      <DialogContent className="flex h-[calc(100dvh-1rem)] w-[min(96vw,72rem)] max-w-none flex-col overflow-hidden p-0 sm:h-[calc(100dvh-1.5rem)] sm:rounded-2xl">
        <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-br from-primary/15 via-background to-background">
          <div className="shrink-0 border-b bg-background/70 px-4 py-4 backdrop-blur sm:px-6 sm:py-5">
            <DialogHeader className="space-y-3 text-left">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1 rounded-full px-3 py-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  Upgrade to Pro
                </Badge>
                {context?.source === "api" ? <Badge variant="outline">Feature blocked</Badge> : null}
              </div>
              <DialogTitle className="text-2xl sm:text-3xl">Unlock the feature your team just hit</DialogTitle>
              <DialogDescription className="max-w-2xl text-sm sm:text-base">
                {featureLabel ? `The ${featureLabel} feature is part of Pro.` : "This capability is part of the Pro plan."}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4 px-4 py-4 sm:space-y-5 sm:px-6 sm:py-6">
                <div className="rounded-2xl border bg-background/80 p-4 shadow-sm sm:rounded-3xl sm:p-5">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Blocked feature</p>
                  <div className="mt-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold sm:text-xl">{featureLabel ?? "Pro feature"}</p>
                      {featureDescription ? <p className="mt-2 text-sm text-muted-foreground">{featureDescription}</p> : null}
                    </div>
                    <Badge className="shrink-0 bg-primary text-primary-foreground hover:bg-primary">Pro only</Badge>
                  </div>
                </div>

                <div className="rounded-2xl border bg-background/80 p-4 shadow-sm sm:rounded-3xl sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Choose billing cycle</p>
                      <p className="text-sm text-muted-foreground">Monthly or annual billing before checkout.</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-full border bg-muted/30 p-1">
                      <button
                        type="button"
                        className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${billingCycle === "monthly" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                        onClick={() => setBillingCycle("monthly")}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${billingCycle === "annual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                        onClick={() => setBillingCycle("annual")}
                      >
                        Annual
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:mt-5 sm:grid-cols-2 sm:gap-4">
                    <div className="rounded-2xl border bg-muted/25 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Free</p>
                      <p className="mt-2 text-3xl font-bold">₹0</p>
                      <p className="mt-1 text-sm text-muted-foreground">For basic bookkeeping</p>
                    </div>
                    <div className="rounded-2xl border border-primary/25 bg-primary/10 p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs uppercase tracking-[0.18em] text-primary">Pro</p>
                        <Badge className="bg-primary text-primary-foreground hover:bg-primary">Best value</Badge>
                      </div>
                      <p className="mt-2 text-3xl font-bold">{formatINR(price)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {billingCycle === "annual" ? `Save ${formatINR(annualSavings)} / year` : "Billed monthly"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:mt-5 sm:grid-cols-2">
                    <div className="rounded-2xl border p-4">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <X className="h-4 w-4 text-muted-foreground" />
                        Free plan
                      </div>
                      <ul className="mt-3 space-y-2.5 text-sm text-muted-foreground">
                        {FREE_POINTS.map((item) => (
                          <li key={item} className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        <Check className="h-4 w-4" />
                        Pro plan
                      </div>
                      <ul className="mt-3 space-y-2.5 text-sm text-foreground">
                        {PRO_POINTS.map((item) => (
                          <li key={item} className="flex items-start gap-2">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t bg-background/60 px-4 py-4 sm:px-6 sm:py-6 lg:border-l lg:border-t-0">
                <div className="rounded-2xl border bg-background p-4 shadow-sm sm:rounded-3xl sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Free vs Pro</p>
                      <p className="mt-1 text-xs text-muted-foreground">A quick snapshot of what changes after upgrade.</p>
                    </div>
                    <Badge variant="outline">Comparison</Badge>
                  </div>

                  <div className="mt-3 space-y-3 sm:mt-4">
                    {FEATURE_ROWS.map((row) => (
                      <div key={row.label} className="rounded-2xl border bg-muted/20 p-3.5">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium">{row.label}</span>
                          <Badge variant="outline" className="text-xs">Pro: {row.pro}</Badge>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <div className="rounded-xl bg-background px-3 py-2">
                            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">Free</p>
                            <p className="mt-1 text-sm font-medium">{row.free}</p>
                          </div>
                          <div className="rounded-xl bg-primary/10 px-3 py-2">
                            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-primary">Pro</p>
                            <p className="mt-1 text-sm font-medium">{row.pro}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl border bg-primary/5 p-4">
                    <p className="text-sm font-medium">Secure checkout</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Razorpay opens after you continue. Your plan refreshes automatically after payment.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t bg-background/80 px-4 py-3 backdrop-blur sm:px-6 sm:py-4 sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {context?.source === "api"
                ? "This modal opened because the API returned an upgrade-required response."
                : "Select a plan and continue to secure checkout."}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={close} disabled={isCheckingOut}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void startCheckout()} disabled={isCheckingOut}>
                {isCheckingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                Continue to Secure Checkout
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
    );
}
