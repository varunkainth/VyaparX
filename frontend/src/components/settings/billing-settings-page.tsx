"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { PageLayout } from "@/components/layout/page-layout";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useUpgradeModalStore } from "@/store/useUpgradeModalStore";
import { subscriptionService } from "@/services/subscription.service";
import { useSubscriptionStore, type SubscriptionStore } from "@/store/useSubscriptionStore";
import type { BillingCycle, SubscriptionPaymentHistoryItem } from "@/types/subscription";
import { BILLING_PRICE, formatINR } from "@/constants/plan-features";
import { CreditCard, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

const formatDate = (value: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatRelativeDays = (value: string | null) => {
  if (!value) return "-";
  const diff = new Date(value).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  return `${days} day${days === 1 ? "" : "s"}`;
};

export function BillingSettingsPage() {
  const status = useSubscriptionStore((state: SubscriptionStore) => state.status);
  const plan = useSubscriptionStore((state: SubscriptionStore) => state.plan);
  const billingStatus = useSubscriptionStore((state: SubscriptionStore) => state.billingStatus);
  const trialEndsAt = useSubscriptionStore((state: SubscriptionStore) => state.trialEndsAt);
  const currentPeriodEnd = useSubscriptionStore((state: SubscriptionStore) => state.currentPeriodEnd);
  const cancelAtPeriodEnd = useSubscriptionStore((state: SubscriptionStore) => state.cancelAtPeriodEnd);
  const billingCycle = useSubscriptionStore((state: SubscriptionStore) => state.billingCycle);
  const refreshStatus = useSubscriptionStore((state: SubscriptionStore) => state.refreshStatus);
  const openUpgradeModal = useUpgradeModalStore((state) => state.open);

  const [history, setHistory] = useState<SubscriptionPaymentHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>(billingCycle ?? "monthly");
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadBillingHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const items = await subscriptionService.getHistory();
      setHistory(items);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load billing history");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBillingHistory();
  }, [loadBillingHistory]);

  useEffect(() => {
    if (billingCycle) {
      setSelectedCycle(billingCycle);
    }
  }, [billingCycle]);

  const currentPlanLabel = useMemo(() => {
    if (plan === "pro") return "Pro";
    if (billingStatus === "trialing") return "Trial";
    return "Free";
  }, [billingStatus, plan]);

  const annualSavings = Math.max(0, (BILLING_PRICE.monthly * 12) - BILLING_PRICE.annual);
  const savingsPercent = Math.round((annualSavings / (BILLING_PRICE.monthly * 12)) * 100);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshStatus();
      await loadBillingHistory();
      toast.success("Billing status refreshed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to refresh billing status");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await subscriptionService.cancel();
      toast.success("Subscription will cancel at period end");
      await handleRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel subscription");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleOpenUpgrade = () => {
    openUpgradeModal({
      billingCycle: selectedCycle,
      feature: "billing_history",
      message: selectedCycle === "annual" ? "Switch to annual billing for a discounted plan." : "Continue monthly billing.",
      source: "manual",
    });
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <PageLayout>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/settings">Settings</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Billing</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6 pb-20 md:pb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 rounded-xl bg-primary/10 border-2 border-primary/20 shrink-0">
                <CreditCard className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Billing Settings</h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                  Manage your plan, billing cycle, and payment history.
                </p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    Current Plan
                    <Badge variant={plan === "pro" ? "default" : "secondary"}>{currentPlanLabel}</Badge>
                    {billingStatus ? <Badge variant="outline">{billingStatus}</Badge> : null}
                  </CardTitle>
                  <CardDescription>
                    {currentPeriodEnd
                      ? `Next billing date: ${formatDate(currentPeriodEnd)} (${formatRelativeDays(currentPeriodEnd)})`
                      : trialEndsAt
                        ? `Trial ends on ${formatDate(trialEndsAt)}`
                        : "No active paid cycle detected."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className={`rounded-lg border p-4 transition-all cursor-pointer ${
                        selectedCycle === "monthly" 
                          ? "border-primary bg-primary/5" 
                          : "border-muted hover:border-primary/50"
                      }`} onClick={() => setSelectedCycle("monthly")}>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Monthly billing</p>
                        <p className="mt-3 text-2xl font-bold">{formatINR(BILLING_PRICE.monthly)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">per month</p>
                      </div>

                      <div className={`rounded-lg border p-4 transition-all cursor-pointer relative overflow-hidden ${
                        selectedCycle === "annual"
                          ? "border-green-500 bg-green-50 dark:bg-green-950/20 ring-2 ring-green-500/20"
                          : "border-muted hover:border-green-500/50"
                      }`} onClick={() => setSelectedCycle("annual")}>
                        {selectedCycle === "annual" && (
                          <div className="absolute top-0 right-0 bg-green-500 text-white text-xs px-2 py-1 rounded-bl">BEST DEAL</div>
                        )}
                        <p className="text-xs uppercase tracking-wide text-green-700 dark:text-green-400">Annual billing</p>
                        <p className="mt-3 text-2xl font-bold text-green-700 dark:text-green-400">{formatINR(BILLING_PRICE.annual)}</p>
                        <p className="mt-1 text-xs text-green-600 dark:text-green-500">per year • Save {savingsPercent}%</p>
                      </div>
                    </div>
                    {selectedCycle === "annual" && (
                      <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 p-3">
                        <p className="text-sm font-medium text-green-900 dark:text-green-200">
                          💰 Save {formatINR(annualSavings)}/year vs monthly • Just {formatINR(BILLING_PRICE.annual / 12)}/month
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button type="button" onClick={handleOpenUpgrade} className="min-w-[180px]">
                      <Sparkles className="h-4 w-4" />
                      {plan === "pro" ? "Switch billing cycle" : "Upgrade plan"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => void handleRefresh()} disabled={isRefreshing}>
                      {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Refresh status
                    </Button>
                    {plan === "pro" && !cancelAtPeriodEnd ? (
                      <Button type="button" variant="destructive" onClick={handleCancel} disabled={isCancelling}>
                        {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Cancel subscription
                      </Button>
                    ) : null}
                  </div>

                  {status?.coupon_code ? (
                    <p className="text-sm text-muted-foreground">
                      Coupon applied: <span className="font-medium">{status.coupon_code}</span>
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Plan Comparison</CardTitle>
                  <CardDescription>See what unlocks when you move from Free to Pro.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Reports</span>
                    <span className="font-medium text-right">Basic vs Advanced dashboards</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Invoices</span>
                    <span className="font-medium text-right">Recurring, branded, and faster billing</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Team</span>
                    <span className="font-medium text-right">Broader collaboration workflows</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">History</span>
                    <span className="font-medium text-right">View payment and invoice records</span>
                  </div>
                  <Separator />
                  <p className="text-xs text-muted-foreground">
                    The global upgrade modal opens Razorpay checkout inside the app shell.
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Billing History</CardTitle>
                <CardDescription>Recent subscription payments and billing periods.</CardDescription>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="h-16 rounded-lg bg-muted/40 animate-pulse" />
                    ))}
                  </div>
                ) : history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No billing history yet.</p>
                ) : (
                  <div className="space-y-3">
                    {history.map((item) => (
                      <div key={item.id} className="rounded-lg border p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{formatINR(item.amount_paise / 100)}</p>
                            <Badge variant={item.status === "captured" ? "default" : "destructive"}>{item.status}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(item.billing_period_start)} → {formatDate(item.billing_period_end)}
                          </p>
                        </div>
                        <div className="text-sm text-muted-foreground sm:text-right">
                          <p>{formatDate(item.created_at)}</p>
                          <p className="truncate max-w-[16rem]">{item.razorpay_payment_id ?? item.razorpay_invoice_id ?? item.id}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </PageLayout>
      </SidebarInset>
    </SidebarProvider>
  );
}
