"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { dashboardService } from "@/services/dashboard.service"
import { useBusinessStore } from "@/store/useBusinessStore"
import type { DashboardData } from "@/types/dashboard"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/error-handler"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { FloatingActionButton } from "@/components/ui/floating-action-button"
import { 
  DollarSign,
  FileText,
  Users,
  Package,
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  BarChart3,
  Activity,
} from "lucide-react"

export function DashboardPage() {
  const router = useRouter()
  const { currentBusiness } = useBusinessStore()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (currentBusiness) {
      fetchDashboardData()
    }
  }, [currentBusiness])

  const fetchDashboardData = async () => {
    if (!currentBusiness) return

    setIsLoading(true)
    try {
      const data = await dashboardService.getDashboardData(currentBusiness.id)
      setDashboardData(data)
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500/10 text-green-700 dark:text-green-400"
      case "partial":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
      case "unpaid":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400"
      case "overdue":
        return "bg-red-500/10 text-red-700 dark:text-red-400"
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400"
    }
  }

  if (!currentBusiness) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Please select a business first</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-96 mt-2" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-3 w-40 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Failed to load dashboard data</p>
      </div>
    )
  }

  const { stats, recent_invoices, recent_payments, low_stock_items } = dashboardData

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6 pb-20 md:pb-6">
      {/* Welcome Section - Mobile Optimized */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            <span className="hidden sm:inline">Welcome back! Here&apos;s an overview of </span>
            <span className="font-medium">{currentBusiness.name}</span>
          </p>
        </div>
        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/analytics")}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/activity")}>
            <Activity className="h-4 w-4 mr-2" />
            Activity
          </Button>
          <Button size="sm" onClick={() => router.push("/invoices/create/sales")}>
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        </div>
      </div>

      {/* Stats Cards - Mobile Optimized */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Revenue Card */}
        <Card className="col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{formatCurrency(stats.revenue.total)}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              {stats.revenue.growth_percentage >= 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-green-600">+{stats.revenue.growth_percentage.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-600" />
                  <span className="text-red-600">{stats.revenue.growth_percentage.toFixed(1)}%</span>
                </>
              )}
              <span className="ml-1 hidden sm:inline">from last month</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mt-3 text-xs">
              <div className="flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3 text-green-600" />
                <span className="truncate">Sales: {formatCurrency(stats.revenue.sales)}</span>
              </div>
              <div className="flex items-center gap-1">
                <ArrowDownRight className="h-3 w-3 text-red-600" />
                <span className="truncate">Purchase: {formatCurrency(stats.revenue.purchases)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoices Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{stats.invoices.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.invoices.sales} sales<span className="hidden sm:inline">, {stats.invoices.purchases} purchases</span>
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              {stats.invoices.unpaid > 0 && (
                <Badge variant="outline" className="text-xs">
                  {stats.invoices.unpaid} unpaid
                </Badge>
              )}
              {stats.invoices.overdue > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {stats.invoices.overdue} overdue
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payments Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Payments</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{stats.payments.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.payments.received} received<span className="hidden sm:inline">, {stats.payments.made} made</span>
            </p>
            {stats.payments.unreconciled > 0 && (
              <Badge variant="outline" className="text-xs mt-3">
                {stats.payments.unreconciled} unreconciled
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Parties Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Parties</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{stats.parties.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.parties.customers} customers<span className="hidden sm:inline">, {stats.parties.suppliers} suppliers</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.parties.active} active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Alert - Mobile Optimized */}
      {stats.inventory.low_stock_items > 0 && (
        <Card className="border-orange-500/50 bg-orange-500/5">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10 shrink-0">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="text-base md:text-lg">Low Stock Alert</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    {stats.inventory.low_stock_items} items running low
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/inventory/low-stock")}
                className="w-full sm:w-auto"
              >
                View Items
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Quick Actions - Mobile Optimized */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card
          className="hover:bg-accent/50 transition-colors cursor-pointer active:scale-95"
          onClick={() => router.push("/invoices/create/sales")}
        >
          <CardHeader className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <FileText className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm md:text-base lg:text-lg">Create Invoice</CardTitle>
                <CardDescription className="text-xs">Generate new invoice</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card
          className="hover:bg-accent/50 transition-colors cursor-pointer active:scale-95"
          onClick={() => router.push("/parties/create")}
        >
          <CardHeader className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <Users className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm md:text-base lg:text-lg">Add Party</CardTitle>
                <CardDescription className="text-xs">Create customer/supplier</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card
          className="hover:bg-accent/50 transition-colors cursor-pointer active:scale-95"
          onClick={() => router.push("/inventory/create")}
        >
          <CardHeader className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <Package className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm md:text-base lg:text-lg">Add Item</CardTitle>
                <CardDescription className="text-xs">Create inventory item</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card
          className="hover:bg-accent/50 transition-colors cursor-pointer active:scale-95"
          onClick={() => router.push("/payments/record")}
        >
          <CardHeader className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <Wallet className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm md:text-base lg:text-lg">Record Payment</CardTitle>
                <CardDescription className="text-xs">Add payment entry</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Recent Activity - Mobile Optimized */}
      <div className="grid gap-3 md:gap-4 lg:grid-cols-2">
        {/* Recent Invoices */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base md:text-lg">Recent Invoices</CardTitle>
                <CardDescription className="text-xs md:text-sm">Latest transactions</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/invoices")}
                className="text-xs"
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recent_invoices.length === 0 ? (
              <div className="text-center py-6 md:py-8 text-muted-foreground">
                <FileText className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 md:mb-3 opacity-50" />
                <p className="text-sm">No invoices yet</p>
                <Button
                  variant="link"
                  size="sm"
                  className="mt-2 text-xs"
                  onClick={() => router.push("/invoices/create/sales")}
                >
                  Create your first invoice
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recent_invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center gap-3 cursor-pointer hover:bg-accent/50 p-2 rounded-lg transition-colors active:scale-98"
                    onClick={() => router.push(`/invoices/${invoice.id}`)}
                  >
                    <div className="p-2 rounded-lg bg-muted shrink-0">
                      {invoice.invoice_type === "sales" ? (
                        <ArrowUpRight className="h-4 w-4 text-green-600" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium leading-none truncate">
                          {invoice.invoice_number}
                        </p>
                        <Badge
                          variant="outline"
                          className={`text-xs ${getPaymentStatusColor(invoice.payment_status)}`}
                        >
                          {invoice.payment_status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {invoice.party_name} • {formatDate(invoice.invoice_date)}
                      </p>
                    </div>
                    <div className="text-sm font-medium shrink-0">{formatCurrency(invoice.grand_total)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base md:text-lg">Recent Payments</CardTitle>
                <CardDescription className="text-xs md:text-sm">Latest transactions</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/payments")}
                className="text-xs"
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recent_payments.length === 0 ? (
              <div className="text-center py-6 md:py-8 text-muted-foreground">
                <Wallet className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 md:mb-3 opacity-50" />
                <p className="text-sm">No payments yet</p>
                <Button
                  variant="link"
                  size="sm"
                  className="mt-2 text-xs"
                  onClick={() => router.push("/payments/record")}
                >
                  Record your first payment
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recent_payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center gap-3 cursor-pointer hover:bg-accent/50 p-2 rounded-lg transition-colors active:scale-98"
                    onClick={() => router.push(`/payments/${payment.id}`)}
                  >
                    <div className="p-2 rounded-lg bg-muted shrink-0">
                      {payment.payment_type === "received" ? (
                        <ArrowUpRight className="h-4 w-4 text-green-600" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-medium leading-none truncate">
                        {payment.party_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {payment.payment_mode} • {formatDate(payment.payment_date)}
                      </p>
                    </div>
                    <div className="text-sm font-medium shrink-0">{formatCurrency(payment.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Items - Mobile Optimized */}
      {low_stock_items.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base md:text-lg">Low Stock Items</CardTitle>
                <CardDescription className="text-xs md:text-sm">Items that need restocking</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/inventory/low-stock")}
                className="text-xs"
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 md:space-y-3">
              {low_stock_items.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors active:scale-98"
                  onClick={() => router.push(`/inventory/${item.id}`)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-lg bg-orange-500/10 shrink-0">
                      <Package className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="hidden sm:inline">Current: </span>{item.current_stock} {item.unit}
                        <span className="hidden sm:inline"> • Threshold: {item.low_stock_threshold} {item.unit}</span>
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-orange-500/10 text-orange-700 dark:text-orange-400 text-xs shrink-0">
                    Low
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mobile FAB */}
      <FloatingActionButton
        actions={[
          {
            label: "Create Invoice",
            icon: <FileText className="h-5 w-5" />,
            onClick: () => router.push("/invoices/create/sales"),
          },
          {
            label: "Add Party",
            icon: <Users className="h-5 w-5" />,
            onClick: () => router.push("/parties/create"),
          },
          {
            label: "Add Item",
            icon: <Package className="h-5 w-5" />,
            onClick: () => router.push("/inventory/create"),
          },
          {
            label: "Record Payment",
            icon: <Wallet className="h-5 w-5" />,
            onClick: () => router.push("/payments/record"),
          },
        ]}
      />
    </div>
  )
}
