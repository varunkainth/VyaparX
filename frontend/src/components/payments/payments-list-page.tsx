"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBusinessStore } from "@/store/useBusinessStore";
import { paymentService } from "@/services/payment.service";
import type { Payment, PaymentType, PaymentMode } from "@/types/payment";
import { PAYMENT_MODES } from "@/types/payment";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-handler";
import { hasPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  Plus,
  Search,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CheckCircle,
  Clock,
  Filter,
} from "lucide-react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { PageLayout } from "@/components/layout/page-layout";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import {
  MobileTable,
  MobileTableRow,
  MobileTableCell,
} from "@/components/ui/mobile-table";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

export function PaymentsListPage() {
  const router = useRouter();
  const { currentBusiness } = useBusinessStore();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<
    PaymentType | "all"
  >("all");
  const [paymentModeFilter, setPaymentModeFilter] = useState<
    PaymentMode | "all"
  >("all");
  const [showReconciled, setShowReconciled] = useState(true);
  const [showUnreconciled, setShowUnreconciled] = useState(true);

  useEffect(() => {
    if (currentBusiness) {
      fetchPayments();
    }
  }, [currentBusiness]);

  useEffect(() => {
    filterPayments();
  }, [
    payments,
    searchQuery,
    paymentTypeFilter,
    paymentModeFilter,
    showReconciled,
    showUnreconciled,
  ]);

  const fetchPayments = async () => {
    if (!currentBusiness) return;

    setIsLoading(true);
    try {
      const data = await paymentService.listPayments(currentBusiness.id, {
        limit: 100,
      });
      setPayments(data.items);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = payments;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (payment) =>
          payment.party_name.toLowerCase().includes(query) ||
          payment.notes?.toLowerCase().includes(query) ||
          payment.upi_ref?.toLowerCase().includes(query) ||
          payment.cheque_no?.toLowerCase().includes(query),
      );
    }

    // Filter by payment type
    if (paymentTypeFilter !== "all") {
      filtered = filtered.filter(
        (payment) => payment.payment_type === paymentTypeFilter,
      );
    }

    // Filter by payment mode
    if (paymentModeFilter !== "all") {
      filtered = filtered.filter(
        (payment) => payment.payment_mode === paymentModeFilter,
      );
    }

    // Filter by reconciliation status
    if (!showReconciled || !showUnreconciled) {
      filtered = filtered.filter((payment) => {
        if (showReconciled && !showUnreconciled) return payment.is_reconciled;
        if (!showReconciled && showUnreconciled) return !payment.is_reconciled;
        return true;
      });
    }

    setFilteredPayments(filtered);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
    }).format(new Date(dateString));
  };

  const getTotalReceived = () => {
    return payments
      .filter((p) => p.payment_type === "received")
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const getTotalMade = () => {
    return payments
      .filter((p) => p.payment_type === "made")
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const getUnreconciledCount = () => {
    return payments.filter((p) => !p.is_reconciled).length;
  };

  const getPaymentModeLabel = (mode: PaymentMode) => {
    return PAYMENT_MODES.find((m) => m.value === mode)?.label || mode;
  };

  if (!currentBusiness) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex min-h-screen items-center justify-center">
            <p className="text-muted-foreground">
              Please select a business first
            </p>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const canCreateEdit = hasPermission(currentBusiness.role, "createEdit");

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <PageLayout onRefresh={fetchPayments}>
          {/* Header */}
          <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Payments</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          {/* Main Content - Mobile Optimized */}
          <div className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6 pb-20 md:pb-6">
            {/* Page Header - Mobile Optimized */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 md:p-3 rounded-xl bg-primary/10 border-2 border-primary/20 flex-shrink-0">
                  <Wallet className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
                    Payments
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 truncate">
                    <span className="hidden sm:inline">
                      Track all payment transactions
                    </span>
                    <span className="sm:hidden">Track transactions</span>
                  </p>
                </div>
              </div>
              {canCreateEdit && (
                <Button
                  onClick={() => router.push("/payments/record")}
                  className="cursor-pointer w-full sm:hidden"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              )}
            </div>

            {/* Stats Cards - Mobile Optimized */}
            <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">
                    <span className="hidden sm:inline">Total Payments</span>
                    <span className="sm:hidden">Total</span>
                  </CardTitle>
                  <Wallet className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold">
                    {payments.length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">
                    Received
                  </CardTitle>
                  <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-green-600 flex-shrink-0" />
                </CardHeader>
                <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                  <div className="text-sm sm:text-lg md:text-2xl font-bold text-green-600 truncate">
                    {formatCurrency(getTotalReceived())}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">
                    Made
                  </CardTitle>
                  <TrendingDown className="h-3 w-3 md:h-4 md:w-4 text-red-600 flex-shrink-0" />
                </CardHeader>
                <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                  <div className="text-sm sm:text-lg md:text-2xl font-bold text-red-600 truncate">
                    {formatCurrency(getTotalMade())}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">
                    <span className="hidden sm:inline">Unreconciled</span>
                    <span className="sm:hidden">Pending</span>
                  </CardTitle>
                  <Clock className="h-3 w-3 md:h-4 md:w-4 text-orange-600 flex-shrink-0" />
                </CardHeader>
                <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-orange-600">
                    {getUnreconciledCount()}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters - Mobile Optimized */}
            <Card>
              <CardContent className="pt-4 md:pt-6 p-3 md:p-6">
                <div className="flex flex-col gap-3 md:gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs md:text-sm font-medium">
                      Filters
                    </span>
                  </div>
                  <div className="grid gap-3 md:gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="relative sm:col-span-2 lg:col-span-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 text-sm"
                      />
                    </div>
                    <Select
                      value={paymentTypeFilter}
                      onValueChange={(value) =>
                        setPaymentTypeFilter(value as PaymentType | "all")
                      }
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Payment Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="received">Received</SelectItem>
                        <SelectItem value="made">Made</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={paymentModeFilter}
                      onValueChange={(value) =>
                        setPaymentModeFilter(value as PaymentMode | "all")
                      }
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Payment Mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Modes</SelectItem>
                        {PAYMENT_MODES.map((mode) => (
                          <SelectItem key={mode.value} value={mode.value}>
                            {mode.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-1">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="reconciled"
                          checked={showReconciled}
                          onCheckedChange={(checked) =>
                            setShowReconciled(checked as boolean)
                          }
                        />
                        <label
                          htmlFor="reconciled"
                          className="text-xs md:text-sm cursor-pointer"
                        >
                          Reconciled
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="unreconciled"
                          checked={showUnreconciled}
                          onCheckedChange={(checked) =>
                            setShowUnreconciled(checked as boolean)
                          }
                        />
                        <label
                          htmlFor="unreconciled"
                          className="text-xs md:text-sm cursor-pointer"
                        >
                          Unreconciled
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payments List - Mobile Optimized */}
            <Card>
              <CardHeader className="p-3 md:p-6">
                <CardTitle className="text-base md:text-lg">
                  All Payments ({filteredPayments.length})
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  <span className="hidden sm:inline">
                    Click on a payment to view details
                  </span>
                  <span className="sm:hidden">Tap to view details</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                ) : filteredPayments.length === 0 ? (
                  <div className="text-center py-8">
                    <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm md:text-base text-muted-foreground">
                      {searchQuery ||
                      paymentTypeFilter !== "all" ||
                      paymentModeFilter !== "all"
                        ? "No payments found matching your filters"
                        : "No payments yet. Record your first payment to get started."}
                    </p>
                    {!searchQuery &&
                      paymentTypeFilter === "all" &&
                      paymentModeFilter === "all" &&
                      canCreateEdit && (
                        <Button
                          onClick={() => router.push("/payments/record")}
                          className="mt-4 cursor-pointer"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Record Payment
                        </Button>
                      )}
                  </div>
                ) : (
                  <>
                    {/* Desktop View */}
                    <div className="hidden md:block space-y-3">
                      {filteredPayments.map((payment) => (
                        <div
                          key={payment.id}
                          onClick={() => router.push(`/payments/${payment.id}`)}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div
                              className={`p-2 rounded-full ${
                                payment.payment_type === "received"
                                  ? "bg-green-100 dark:bg-green-900/20"
                                  : "bg-red-100 dark:bg-red-900/20"
                              }`}
                            >
                              {payment.payment_type === "received" ? (
                                <TrendingUp className="h-5 w-5 text-green-600" />
                              ) : (
                                <TrendingDown className="h-5 w-5 text-red-600" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">
                                  {payment.party_name}
                                </p>
                                <Badge
                                  variant={
                                    payment.payment_type === "received"
                                      ? "default"
                                      : "secondary"
                                  }
                                  className="text-xs"
                                >
                                  {payment.payment_type === "received"
                                    ? "Received"
                                    : "Made"}
                                </Badge>
                                {payment.is_reconciled ? (
                                  <Badge
                                    variant="outline"
                                    className="text-green-600 border-green-600 text-xs"
                                  >
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    {payment.payment_mode === "cash"
                                      ? "Verified"
                                      : "Reconciled"}
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-orange-600 border-orange-600 text-xs"
                                  >
                                    <Clock className="h-3 w-3 mr-1" />
                                    {payment.payment_mode === "cash"
                                      ? "Pending"
                                      : "Unreconciled"}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                <span>{formatDate(payment.payment_date)}</span>
                                <span>
                                  {getPaymentModeLabel(payment.payment_mode)}
                                </span>
                                {payment.upi_ref && (
                                  <span>UPI: {payment.upi_ref}</span>
                                )}
                                {payment.cheque_no && (
                                  <span>Cheque: {payment.cheque_no}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-xl font-bold ${
                                payment.payment_type === "received"
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {formatCurrency(payment.amount)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Mobile View */}
                    <MobileTable className="md:hidden">
                      {filteredPayments.map((payment) => (
                        <MobileTableRow
                          key={payment.id}
                          onClick={() => router.push(`/payments/${payment.id}`)}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className={`p-1.5 rounded-full flex-shrink-0 ${
                                payment.payment_type === "received"
                                  ? "bg-green-100 dark:bg-green-900/20"
                                  : "bg-red-100 dark:bg-red-900/20"
                              }`}
                            >
                              {payment.payment_type === "received" ? (
                                <TrendingUp className="h-4 w-4 text-green-600" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-red-600" />
                              )}
                            </div>
                            <p className="font-medium text-sm truncate flex-1">
                              {payment.party_name}
                            </p>
                            <Badge
                              variant={
                                payment.payment_type === "received"
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-xs flex-shrink-0"
                            >
                              {payment.payment_type === "received"
                                ? "Received"
                                : "Made"}
                            </Badge>
                          </div>
                          <MobileTableCell label="Amount">
                            <span
                              className={`font-bold text-sm ${
                                payment.payment_type === "received"
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {formatCurrency(payment.amount)}
                            </span>
                          </MobileTableCell>
                          <MobileTableCell label="Date">
                            <span className="text-xs">
                              {formatDate(payment.payment_date)}
                            </span>
                          </MobileTableCell>
                          <MobileTableCell label="Mode">
                            <span className="text-xs">
                              {getPaymentModeLabel(payment.payment_mode)}
                            </span>
                          </MobileTableCell>
                          <div className="flex items-center gap-2 mt-2">
                            {payment.is_reconciled ? (
                              <Badge
                                variant="outline"
                                className="text-green-600 border-green-600 text-xs"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                {payment.payment_mode === "cash"
                                  ? "Verified"
                                  : "Reconciled"}
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-orange-600 border-orange-600 text-xs"
                              >
                                <Clock className="h-3 w-3 mr-1" />
                                {payment.payment_mode === "cash"
                                  ? "Pending"
                                  : "Unreconciled"}
                              </Badge>
                            )}
                          </div>
                        </MobileTableRow>
                      ))}
                    </MobileTable>
                  </>
                )}
              </CardContent>
            </Card>

            {/* FAB for Mobile */}
            {canCreateEdit && (
              <FloatingActionButton
                onClick={() => router.push("/payments/record")}
                icon={<Plus className="h-6 w-6" />}
                label="Record Payment"
              />
            )}
          </div>
        </PageLayout>
      </SidebarInset>
    </SidebarProvider>
  );
}
