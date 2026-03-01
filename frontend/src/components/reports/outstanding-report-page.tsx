"use client";

import { useEffect, useState } from "react";
import { useBusinessStore } from "@/store/useBusinessStore";
import { reportService } from "@/services/report.service";
import type { OutstandingReport } from "@/types/report";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-handler";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  Users,
  Phone,
} from "lucide-react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/skeleton-loader";

export function OutstandingReportPage() {
  const { currentBusiness } = useBusinessStore();
  const [report, setReport] = useState<OutstandingReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (currentBusiness) {
      fetchReport();
    }
  }, [currentBusiness]);

  const fetchReport = async () => {
    if (!currentBusiness) return;

    setIsLoading(true);
    try {
      const data = await reportService.getOutstanding(currentBusiness.id);
      setReport(data);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format: "csv" | "excel") => {
    if (!currentBusiness) return;

    setIsExporting(true);
    try {
      const blob = await reportService.exportOutstanding(currentBusiness.id, format);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `outstanding-report.${format === "excel" ? "xlsx" : "csv"}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      toast.error(`Export failed: ${errorMessage}`);
    } finally {
      setIsExporting(false);
    }
  };

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(numAmount);
  };

  const getPartyTypeColor = (type: string) => {
    switch (type) {
      case "customer":
        return "default";
      case "supplier":
        return "secondary";
      case "both":
        return "outline";
      default:
        return "outline";
    }
  };

  const receivableParties = report?.parties.filter(
    (p) => parseFloat(p.current_balance) > 0
  ) || [];

  const payableParties = report?.parties.filter(
    (p) => parseFloat(p.current_balance) < 0
  ) || [];

  if (!currentBusiness) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex min-h-screen items-center justify-center">
            <p className="text-muted-foreground">Please select a business first</p>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
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
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/reports/sales">Reports</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Outstanding</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex flex-1 flex-col gap-6 p-6 pb-20 md:pb-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10 border-2 border-primary/20">
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Outstanding Report
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Track receivables and payables
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => handleExport("csv")}
                disabled={isExporting || !report}
                className="cursor-pointer w-full sm:w-auto"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport("excel")}
                disabled={isExporting || !report}
                className="cursor-pointer w-full sm:w-auto"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>

          {isLoading ? (
            <>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <Card>
                  <CardHeader>
                    <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 w-24 bg-muted animate-pulse rounded" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 w-24 bg-muted animate-pulse rounded" />
                  </CardContent>
                </Card>
              </div>
              <ListSkeleton count={5} type="party" />
            </>
          ) : !report ? (
            <EmptyState
              icon={FileText}
              title="No data available"
              description="Unable to load outstanding report. Please try again."
              action={{
                label: "Retry",
                onClick: fetchReport,
              }}
            />
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Receivable
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(report.summary.total_receivable)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      From {receivableParties.length} {receivableParties.length === 1 ? "party" : "parties"}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Payable
                    </CardTitle>
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(Math.abs(parseFloat(report.summary.total_payable)))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      To {payableParties.length} {payableParties.length === 1 ? "party" : "parties"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Receivables */}
              {receivableParties.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      Receivables ({receivableParties.length})
                    </CardTitle>
                    <CardDescription>
                      Parties who owe you money
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {receivableParties.map((party) => (
                        <div
                          key={party.id}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors gap-3"
                        >
                          <div className="flex items-start sm:items-center gap-4 flex-1 w-full">
                            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/20 shrink-0">
                              <Users className="h-5 w-5 text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium truncate">{party.name}</p>
                                <Badge
                                  variant={getPartyTypeColor(party.party_type)}
                                  className="capitalize"
                                >
                                  {party.party_type}
                                </Badge>
                              </div>
                              {party.phone && (
                                <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  {party.phone}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-left sm:text-right w-full sm:w-auto">
                            <p className="text-sm text-muted-foreground">Amount Due</p>
                            <p className="text-lg font-bold text-green-600">
                              {formatCurrency(party.current_balance)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Payables */}
              {payableParties.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-red-600" />
                      Payables ({payableParties.length})
                    </CardTitle>
                    <CardDescription>
                      Parties you owe money to
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {payableParties.map((party) => (
                        <div
                          key={party.id}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors gap-3"
                        >
                          <div className="flex items-start sm:items-center gap-4 flex-1 w-full">
                            <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/20 shrink-0">
                              <Users className="h-5 w-5 text-red-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium truncate">{party.name}</p>
                                <Badge
                                  variant={getPartyTypeColor(party.party_type)}
                                  className="capitalize"
                                >
                                  {party.party_type}
                                </Badge>
                              </div>
                              {party.phone && (
                                <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  {party.phone}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-left sm:text-right w-full sm:w-auto">
                            <p className="text-sm text-muted-foreground">Amount Owed</p>
                            <p className="text-lg font-bold text-red-600">
                              {formatCurrency(Math.abs(parseFloat(party.current_balance)))}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {receivableParties.length === 0 && payableParties.length === 0 && (
                <EmptyState
                  icon={FileText}
                  title="No outstanding amounts"
                  description="All accounts are settled. There are no receivables or payables at the moment."
                />
              )}
            </>
          )}
        </div>
        <MobileBottomNav />
      </SidebarInset>
    </SidebarProvider>
  );
}
