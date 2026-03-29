"use client"

import { useRouter } from "next/navigation";
import { useDashboard } from "@/hooks/queries/useDashboard";
import { useBusinessStore } from "@/store/useBusinessStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
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
} from "lucide-react";

export function OptimizedDashboard() {
  const router = useRouter();
  const { currentBusiness } = useBusinessStore();

  const formatInvoicePartyName = (partyName?: string | null) => {
    const normalized = String(partyName ?? "").trim();
    return normalized ? normalized.toUpperCase() : "PARTY DETAILS UNAVAILABLE";
  };
  
  const { data: dashboardData, isLoading } = useDashboard(currentBusiness?.id);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "partial":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      case "unpaid":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
      case "overdue":
        return "bg-red-500/10 text-red-700 dark:text-red-400";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  };

  if (!currentBusiness) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Please select a business first</p>
      </div>
    );
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
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Failed to load dashboard data</p>
      </div>
    );
  }

  const { stats, recent_invoices, recent_payments, low_stock_items } = dashboardData;

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6 pb-20 md:pb-6">
      {/* Welcome Section */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            <span className="hidden sm:inline">Welcome back! Here&apos;s an overview of </span>
            <span className="font-medium">{currentBusiness.name}</span>
          </p>
        </div>
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

      {/* Stats Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{stats.invoices.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.invoices.sales} sales, {stats.invoices.purchases} purchases
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Payments</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{stats.payments.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.payments.received} received, {stats.payments.made} made
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Parties</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{stats.parties.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.parties.customers} customers, {stats.parties.suppliers} suppliers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
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

      {/* Quick Actions */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card
          className="hover:bg-accent/50 transition-colors cursor-pointer"
          onClick={() => router.push("/invoices/create/sales")}
        >
          <CardHeader className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm md:text-base">Create Invoice</CardTitle>
                <CardDescription className="text-xs">Generate new invoice</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card
          className="hover:bg-accent/50 transition-colors cursor-pointer"
          onClick={() => router.push("/parties/create")}
        >
          <CardHeader className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm md:text-base">Add Party</CardTitle>
                <CardDescription className="text-xs">Create customer/supplier</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card
          className="hover:bg-accent/50 transition-colors cursor-pointer"
          onClick={() => router.push("/inventory/create")}
        >
          <CardHeader className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm md:text-base">Add Item</CardTitle>
                <CardDescription className="text-xs">Create inventory item</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card
          className="hover:bg-accent/50 transition-colors cursor-pointer"
          onClick={() => router.push("/payments/record")}
        >
          <CardHeader className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm md:text-base">Record Payment</CardTitle>
                <CardDescription className="text-xs">Add payment entry</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-3 md:gap-4 lg:grid-cols-2">
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
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No invoices yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recent_invoices.map((invoice: any) => (
                  <div
                    key={invoice.id}
                    className="flex items-center gap-3 cursor-pointer hover:bg-accent/50 p-2 rounded-lg transition-colors"
                    onClick={() => router.push(`/invoices/${invoice.id}`)}
                  >
                    <div className="p-2 rounded-lg bg-muted">
                      {invoice.invoice_type === "sales" ? (
                        <ArrowUpRight className="h-4 w-4 text-green-600" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{invoice.invoice_number}</p>
                        <Badge
                          variant="outline"
                          className={`text-xs ${getPaymentStatusColor(invoice.payment_status)}`}
                        >
                          {invoice.payment_status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {formatInvoicePartyName(invoice.party_name)} • {formatDate(invoice.invoice_date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{formatCurrency(invoice.grand_total)}</div>
                      <div className="text-[11px] text-muted-foreground">Final Total</div>
                      <div className="text-[11px] text-muted-foreground">
                        Before: {formatCurrency(invoice.grand_total - invoice.round_off)}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Round Off: {formatCurrency(invoice.round_off)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

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
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No payments yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recent_payments.map((payment: any) => (
                  <div
                    key={payment.id}
                    className="flex items-center gap-3 cursor-pointer hover:bg-accent/50 p-2 rounded-lg transition-colors"
                    onClick={() => router.push(`/payments/${payment.id}`)}
                  >
                    <div className="p-2 rounded-lg bg-muted">
                      {payment.payment_type === "received" ? (
                        <ArrowUpRight className="h-4 w-4 text-green-600" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{payment.party_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {payment.payment_mode} • {formatDate(payment.payment_date)}
                      </p>
                    </div>
                    <div className="text-sm font-medium">{formatCurrency(payment.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
  );
}
