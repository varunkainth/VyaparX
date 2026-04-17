"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { PageLayout } from "@/components/layout/page-layout"
import { Badge } from "@/components/ui/badge"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { loadRazorpayScript } from "@/lib/razorpay"
import { subscriptionService } from "@/services/subscription.service"
import { useAuthStore } from "@/store/useAuthStore"
import { useSubscriptionStore } from "@/store/useSubscriptionStore"
import type { BillingCycle, SubscriptionStatus } from "@/types/subscription"
import { CreditCard, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"

const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS = 10000

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function SubscriptionPage() {
  const user = useAuthStore((state) => state.user)
  const { status, isLoading, isPolling, setStatus, setLoading, setPolling } = useSubscriptionStore()

  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly")
  const [couponCode, setCouponCode] = useState("")
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isGatewayModalOpen, setIsGatewayModalOpen] = useState(false)
  const [isLaunchingGateway, setIsLaunchingGateway] = useState(false)
  const [pendingSession, setPendingSession] = useState<{ subscription_id: string; razorpay_key: string } | null>(null)
  const pollingLockRef = useRef(false)

  const refreshStatus = useCallback(async () => {
    setLoading(true)
    try {
      const nextStatus = await subscriptionService.getStatus()
      setStatus(nextStatus)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch subscription status")
    } finally {
      setLoading(false)
    }
  }, [setLoading, setStatus])

  useEffect(() => {
    void refreshStatus()
  }, [refreshStatus])

  const pollForUpgrade = useCallback(async (): Promise<SubscriptionStatus | null> => {
    setPolling(true)
    try {
      for (let elapsed = 0; elapsed <= POLL_TIMEOUT_MS; elapsed += POLL_INTERVAL_MS) {
        const nextStatus = await subscriptionService.getStatus()
        setStatus(nextStatus)

        if (nextStatus?.plan === "pro") {
          toast.success("Upgrade successful. Pro plan is now active.")
          return nextStatus
        }

        if (elapsed < POLL_TIMEOUT_MS) {
          await sleep(POLL_INTERVAL_MS)
        }
      }

      toast.message("Payment received. We are still waiting for confirmation.")
      return null
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to refresh subscription status")
      return null
    } finally {
      setPolling(false)
    }
  }, [setPolling, setStatus])

  const pollAfterCheckout = useCallback(async () => {
    if (pollingLockRef.current) return
    pollingLockRef.current = true

    try {
      await pollForUpgrade()
    } finally {
      pollingLockRef.current = false
    }
  }, [pollForUpgrade])

  const openRazorpayCheckout = useCallback(async () => {
    if (!pendingSession) {
      toast.error("Payment session expired. Please try again.")
      return
    }

    setIsLaunchingGateway(true)
    try {
      await loadRazorpayScript()

      if (!window.Razorpay) {
        throw new Error("Razorpay checkout is not available")
      }

      const checkout = new window.Razorpay({
        key: pendingSession.razorpay_key,
        subscription_id: pendingSession.subscription_id,
        name: "VyaparX",
        description: `Upgrade to Pro (${billingCycle})`,
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: user?.phone,
        },
        theme: {
          color: "#2563eb",
        },
        handler: () => {
          void pollAfterCheckout()
        },
        modal: {
          ondismiss: () => {
            void pollAfterCheckout()
          },
        },
      })

      checkout.open()
      setIsGatewayModalOpen(false)
      toast.success("Checkout opened")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to open payment gateway")
    } finally {
      setIsLaunchingGateway(false)
    }
  }, [billingCycle, pendingSession, pollAfterCheckout, user?.email, user?.name, user?.phone])

  const handleUpgrade = async () => {
    setIsUpgrading(true)
    try {
      const session = await subscriptionService.createSession({
        billing_cycle: billingCycle,
        coupon_code: couponCode.trim() || undefined,
      })

      setPendingSession(session)
      setIsGatewayModalOpen(true)
      toast.success("Payment session created")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start upgrade")
    } finally {
      setIsUpgrading(false)
    }
  }

  const handleCancel = async () => {
    setIsCancelling(true)
    try {
      await subscriptionService.cancel()
      toast.success("Subscription will cancel at period end")
      await refreshStatus()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel subscription")
    } finally {
      setIsCancelling(false)
    }
  }

  const currentPlan = status?.plan ?? "free"

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
                    <BreadcrumbPage>Subscription</BreadcrumbPage>
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
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Subscription</h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                  Upgrade plan, apply coupon, and track billing status.
                </p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Current Plan
                  <Badge variant={currentPlan === "pro" ? "default" : "secondary"}>
                    {currentPlan.toUpperCase()}
                  </Badge>
                  {status?.status ? (
                    <Badge variant="outline">{status.status}</Badge>
                  ) : null}
                </CardTitle>
                <CardDescription>
                  {status?.current_period_end
                    ? `Current period ends on ${new Date(status.current_period_end).toLocaleDateString()}`
                    : "No active paid cycle detected."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="billing-cycle">Billing Cycle</Label>
                    <Select
                      value={billingCycle}
                      onValueChange={(value) => setBillingCycle(value as BillingCycle)}
                    >
                      <SelectTrigger id="billing-cycle" className="w-full">
                        <SelectValue placeholder="Choose cycle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="coupon-code">Coupon Code (Optional)</Label>
                    <Input
                      id="coupon-code"
                      value={couponCode}
                      onChange={(event) => setCouponCode(event.target.value)}
                      placeholder="SAVE20"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    onClick={handleUpgrade}
                    disabled={isUpgrading || isPolling}
                    className="min-w-[160px]"
                  >
                    {isUpgrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Upgrade to Pro
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void refreshStatus()}
                    disabled={isLoading || isPolling}
                  >
                    {(isLoading || isPolling) ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Refresh Status
                  </Button>

                  {status?.plan === "pro" && !status.cancel_at_period_end ? (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleCancel}
                      disabled={isCancelling}
                    >
                      {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Cancel at Period End
                    </Button>
                  ) : null}
                </div>

                {isPolling ? (
                  <p className="text-sm text-muted-foreground">
                    Waiting for payment confirmation from Razorpay. Status will auto-refresh every 2 seconds.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <Dialog open={isGatewayModalOpen} onOpenChange={setIsGatewayModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment Gateway
                </DialogTitle>
                <DialogDescription>
                  Continue to Razorpay secure checkout to complete your Pro upgrade.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
                <p>
                  Plan: <span className="font-medium">Pro ({billingCycle})</span>
                </p>
                <p>
                  Account: <span className="font-medium">{user?.email || "Current user"}</span>
                </p>
                {couponCode.trim() ? (
                  <p>
                    Coupon: <span className="font-medium">{couponCode.trim()}</span>
                  </p>
                ) : null}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsGatewayModalOpen(false)}
                  disabled={isLaunchingGateway}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => void openRazorpayCheckout()}
                  disabled={isLaunchingGateway}
                >
                  {isLaunchingGateway ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                  Continue to Payment
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </PageLayout>
      </SidebarInset>
    </SidebarProvider>
  )
}
