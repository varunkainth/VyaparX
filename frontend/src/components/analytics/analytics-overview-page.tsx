"use client";

import { useEffect, useState } from "react";
import { useBusinessStore } from "@/store/useBusinessStore";
import { analyticsService } from "@/services/analytics.service";
import type { AnalyticsOverview, AnalyticsEvent } from "@/types/analytics";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-handler";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Activity,
  Users,
  TrendingUp,
  Clock,
  FileText,
  Package,
  CreditCard,
} from "lucide-react";
import { AppSidebar } from "@/components/layout/app-sidebar";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLayout } from "@/components/layout/page-layout";

export function AnalyticsOverviewPage() {
  const { currentBusiness } = useBusinessStore();
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<number>(24);

  useEffect(() => {
    if (currentBusiness) {
      fetchData();
    }
  }, [currentBusiness, timeRange]);

  const fetchData = async () => {
    if (!currentBusiness) return;

    setIsLoading(true);
    try {
      const [overviewData, eventsData] = await Promise.all([
        analyticsService.getAnalyticsOverview(currentBusiness.id, timeRange),
        analyticsService.getAnalyticsEvents(currentBusiness.id, 10),
      ]);
      setOverview(overviewData);
      setEvents(eventsData.items);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeRange = (ms: number) => {
    const hours = ms / (1000 * 60 * 60);
    if (hours < 24) return `Last ${hours} hours`;
    const days = hours / 24;
    return `Last ${days} ${days === 1 ? "day" : "days"}`;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const getEventIcon = (eventType: string) => {
    if (eventType.includes("invoice")) return FileText;
    if (eventType.includes("payment")) return CreditCard;
    if (eventType.includes("party")) return Users;
    if (eventType.includes("inventory")) return Package;
    return Activity;
  };

  const getEventColor = (eventType: string) => {
    if (eventType.includes("create")) return "text-green-600";
    if (eventType.includes("update")) return "text-blue-600";
    if (eventType.includes("delete")) return "text-red-600";
    return "text-muted-foreground";
  };

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
        <PageLayout onRefresh={fetchData}>
          <div className="flex-1 overflow-x-hidden">
          {/* Header */}
          <header className="flex h-16 shrink-0 items-center gap-2 border-b sticky top-0 bg-background z-10">
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
                    <BreadcrumbLink href="/dashboard/analytics">Analytics</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Overview</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          {/* Main Content */}
          <div className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6 pb-20 md:pb-6">
          {/* Page Header */}
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3 md:gap-4">
              <div className="p-2 md:p-3 rounded-xl bg-primary/10 border-2 border-primary/20 shrink-0">
                <BarChart3 className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
                  Analytics Overview
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  System activity and usage insights
                </p>
              </div>
            </div>
            <Select
              value={timeRange.toString()}
              onValueChange={(value) => setTimeRange(parseInt(value))}
            >
              <SelectTrigger className="w-full text-sm">
                <Clock className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last Hour</SelectItem>
                <SelectItem value="6">Last 6 Hours</SelectItem>
                <SelectItem value="24">Last 24 Hours</SelectItem>
                <SelectItem value="72">Last 3 Days</SelectItem>
                <SelectItem value="168">Last Week</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <>
              <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                    </CardHeader>
                    <CardContent>
                      <div className="h-8 w-24 bg-muted animate-pulse rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : !overview ? (
            <EmptyState
              icon={BarChart3}
              title="No data available"
              description="Unable to load analytics overview. Please try again."
              action={{
                label: "Retry",
                onClick: fetchData,
              }}
            />
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs md:text-sm font-medium">
                      Total Events
                    </CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl md:text-2xl font-bold">{overview.total_events}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTimeRange(overview.time_range_ms)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs md:text-sm font-medium">
                      Active Users
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl md:text-2xl font-bold">{overview.unique_users}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Unique users active
                    </p>
                  </CardContent>
                </Card>
                <Card className="sm:col-span-2 lg:col-span-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs md:text-sm font-medium">
                      Event Types
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl md:text-2xl font-bold">
                      {Object.keys(overview.event_breakdown ?? {}).length}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Different event types
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Event Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Event Breakdown</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Distribution of events by type
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {Object.keys(overview.event_breakdown ?? {}).length === 0 ? (
                    <p className="text-xs md:text-sm text-muted-foreground text-center py-8">
                      No events recorded in this time period
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(overview.event_breakdown ?? {})
                        .sort(([, a], [, b]) => b - a)
                        .map(([eventType, count]) => {
                          const percentage = (count / overview.total_events) * 100;
                          return (
                            <div key={eventType} className="space-y-2">
                              <div className="flex items-center justify-between text-xs md:text-sm">
                                <span className="font-medium capitalize truncate flex-1 mr-2">
                                  {eventType.replace(/_/g, " ")}
                                </span>
                                <span className="text-muted-foreground whitespace-nowrap">
                                  {count} ({percentage.toFixed(1)}%)
                                </span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Events */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Recent Events</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Latest system activities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {events.length === 0 ? (
                    <p className="text-xs md:text-sm text-muted-foreground text-center py-8">
                      No recent events
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {events.map((event) => {
                        const Icon = getEventIcon(event.event_type);
                        const colorClass = getEventColor(event.event_type);
                        return (
                          <div
                            key={event.id}
                            className="flex items-start gap-3 md:gap-4 p-3 border rounded-lg hover:bg-accent/50 transition-colors active:scale-98"
                          >
                            <div className={`p-2 rounded-full bg-muted ${colorClass} shrink-0`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-xs md:text-sm font-medium capitalize">
                                  {event.event_type.replace(/_/g, " ")}
                                </p>
                                <Badge variant="outline" className="text-xs">
                                  {formatDateTime(event.occurred_at)}
                                </Badge>
                              </div>
                              {event.event_data && Object.keys(event.event_data).length > 0 && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                  {JSON.stringify(event.event_data)}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
        </div>
      </PageLayout>
      </SidebarInset>
    </SidebarProvider>
  );
}
