"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBusinessStore } from "@/store/useBusinessStore";
import { partyService } from "@/services/party.service";
import type { Party } from "@/types/party";
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
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  UserPlus,
  TrendingUp,
  TrendingDown,
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
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/skeleton-loader";

interface PartiesListPageProps {
  filterType?: "all" | "customer" | "supplier" | "both";
}

export function PartiesListPage({
  filterType: initialFilterType = "all",
}: PartiesListPageProps) {
  const router = useRouter();
  const { currentBusiness } = useBusinessStore();
  const [parties, setParties] = useState<Party[]>([]);
  const [filteredParties, setFilteredParties] = useState<Party[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [filterType, setFilterType] = useState<
    "all" | "customer" | "supplier" | "both"
  >(initialFilterType);

  const getPageTitle = () => {
    switch (initialFilterType) {
      case "customer":
        return "Customers";
      case "supplier":
        return "Suppliers";
      default:
        return "Parties";
    }
  };

  const getPageDescription = () => {
    switch (initialFilterType) {
      case "customer":
        return "Manage your customers";
      case "supplier":
        return "Manage your suppliers";
      default:
        return "Manage your customers and suppliers";
    }
  };

  useEffect(() => {
    if (currentBusiness) {
      fetchParties();
    }
  }, [currentBusiness, includeInactive]);

  useEffect(() => {
    filterParties();
  }, [parties, searchQuery, filterType]);

  const fetchParties = async () => {
    if (!currentBusiness) return;

    setIsLoading(true);
    try {
      const data = await partyService.listParties(currentBusiness.id, {
        include_inactive: includeInactive,
      });
      setParties(data);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const filterParties = () => {
    let filtered = parties;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (party) =>
          party.name.toLowerCase().includes(query) ||
          party.phone?.toLowerCase().includes(query) ||
          party.email?.toLowerCase().includes(query) ||
          party.gstin?.toLowerCase().includes(query),
      );
    }

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter((party) => party.party_type === filterType);
    }

    setFilteredParties(filtered);
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

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(balance);
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
        <PageLayout onRefresh={fetchParties}>
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
                    <BreadcrumbPage>{getPageTitle()}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          {/* Main Content - Mobile Optimized */}
          <div className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6 pb-20 md:pb-6">
            {/* Page Header - Mobile Optimized */}
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 md:p-3 rounded-xl bg-primary/10 border-2 border-primary/20 flex-shrink-0">
                  <Users className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
                    {getPageTitle()}
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 truncate">
                    {getPageDescription()}
                  </p>
                </div>
              </div>
              {canCreateEdit && (
                <Button
                  onClick={() => router.push("/parties/create")}
                  className="cursor-pointer w-full sm:hidden"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Party
                </Button>
              )}
            </div>

            {/* Stats Cards - Mobile Optimized */}
            <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">
                    <span className="hidden sm:inline">Total Parties</span>
                    <span className="sm:hidden">Parties</span>
                  </CardTitle>
                  <Users className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold">
                    {parties.length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">
                    Customers
                  </CardTitle>
                  <UserPlus className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold">
                    {
                      parties.filter(
                        (p) =>
                          p.party_type === "customer" ||
                          p.party_type === "both",
                      ).length
                    }
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">
                    Suppliers
                  </CardTitle>
                  <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold">
                    {
                      parties.filter(
                        (p) =>
                          p.party_type === "supplier" ||
                          p.party_type === "both",
                      ).length
                    }
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">
                    <span className="hidden sm:inline">Total Receivable</span>
                    <span className="sm:hidden">Receivable</span>
                  </CardTitle>
                  <TrendingDown className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                  <div className="text-sm sm:text-lg md:text-2xl font-bold truncate">
                    {formatBalance(
                      parties
                        .filter((p) => p.current_balance > 0)
                        .reduce((sum, p) => sum + p.current_balance, 0),
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters - Mobile Optimized */}
            <Card>
              <CardContent className="pt-4 md:pt-6 p-3 md:p-6">
                <div className="flex flex-col gap-3 md:gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search parties..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={filterType === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilterType("all")}
                        className="cursor-pointer text-xs"
                      >
                        All
                      </Button>
                      <Button
                        variant={
                          filterType === "customer" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setFilterType("customer")}
                        className="cursor-pointer text-xs"
                      >
                        Customers
                      </Button>
                      <Button
                        variant={
                          filterType === "supplier" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setFilterType("supplier")}
                        className="cursor-pointer text-xs"
                      >
                        Suppliers
                      </Button>
                      <Button
                        variant={filterType === "both" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilterType("both")}
                        className="cursor-pointer text-xs"
                      >
                        Both
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="include-inactive"
                        checked={includeInactive}
                        onCheckedChange={(checked) =>
                          setIncludeInactive(checked as boolean)
                        }
                      />
                      <label
                        htmlFor="include-inactive"
                        className="text-xs md:text-sm font-medium leading-none cursor-pointer"
                      >
                        Include Inactive
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Parties List - Mobile Optimized */}
            <Card>
              <CardHeader className="p-3 md:p-6">
                <CardTitle className="text-base md:text-lg">
                  All Parties ({filteredParties.length})
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  <span className="hidden sm:inline">
                    Click on a party to view details and edit
                  </span>
                  <span className="sm:hidden">Tap to view details</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
                {isLoading ? (
                  <ListSkeleton count={5} type="party" />
                ) : filteredParties.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title={
                      searchQuery || filterType !== "all"
                        ? "No parties found"
                        : "No parties yet"
                    }
                    description={
                      searchQuery || filterType !== "all"
                        ? "Try adjusting your filters or search query to find what you're looking for."
                        : "Get started by adding your first party. You can add customers, suppliers, or parties that are both."
                    }
                    action={
                      searchQuery || filterType !== "all" || !canCreateEdit
                        ? undefined
                        : {
                            label: "Add Party",
                            onClick: () => router.push("/parties/create"),
                          }
                    }
                  />
                ) : (
                  <>
                    {/* Desktop View */}
                    <div className="hidden md:block space-y-3">
                      {filteredParties.map((party) => (
                        <div
                          key={party.id}
                          onClick={() => router.push(`/parties/${party.id}`)}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer gap-3"
                        >
                          <div className="flex items-start sm:items-center gap-4 flex-1 w-full">
                            <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
                              <Users className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium truncate">
                                  {party.name}
                                </p>
                                <Badge
                                  variant={getPartyTypeColor(party.party_type)}
                                  className="capitalize text-xs"
                                >
                                  {party.party_type}
                                </Badge>
                                {!party.is_active && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    Inactive
                                  </Badge>
                                )}
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1 text-sm text-muted-foreground">
                                {party.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">
                                      {party.phone}
                                    </span>
                                  </span>
                                )}
                                {party.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">
                                      {party.email}
                                    </span>
                                  </span>
                                )}
                                {party.city && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3 flex-shrink-0" />
                                    {party.city}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-left sm:text-right w-full sm:w-auto">
                            <p className="text-sm text-muted-foreground">
                              Current Balance
                            </p>
                            <p
                              className={`font-semibold ${party.current_balance > 0 ? "text-green-600" : party.current_balance < 0 ? "text-red-600" : ""}`}
                            >
                              {formatBalance(party.current_balance)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Mobile View */}
                    <MobileTable className="md:hidden">
                      {filteredParties.map((party) => (
                        <MobileTableRow
                          key={party.id}
                          onClick={() => router.push(`/parties/${party.id}`)}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-medium text-sm truncate flex-1">
                              {party.name}
                            </p>
                            <Badge
                              variant={getPartyTypeColor(party.party_type)}
                              className="capitalize text-xs flex-shrink-0"
                            >
                              {party.party_type}
                            </Badge>
                          </div>
                          {party.phone && (
                            <MobileTableCell label="Phone">
                              <span className="flex items-center gap-1 text-xs">
                                <Phone className="h-3 w-3 flex-shrink-0" />
                                {party.phone}
                              </span>
                            </MobileTableCell>
                          )}
                          {party.city && (
                            <MobileTableCell label="City">
                              <span className="flex items-center gap-1 text-xs">
                                <MapPin className="h-3 w-3 flex-shrink-0" />
                                {party.city}
                              </span>
                            </MobileTableCell>
                          )}
                          <MobileTableCell label="Balance">
                            <span
                              className={`font-semibold text-xs ${party.current_balance > 0 ? "text-green-600" : party.current_balance < 0 ? "text-red-600" : ""}`}
                            >
                              {formatBalance(party.current_balance)}
                            </span>
                          </MobileTableCell>
                          {!party.is_active && (
                            <Badge variant="secondary" className="text-xs mt-2">
                              Inactive
                            </Badge>
                          )}
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
                onClick={() => router.push("/parties/create")}
                icon={<Plus className="h-6 w-6" />}
                label="Add Party"
              />
            )}
          </div>
        </PageLayout>
      </SidebarInset>
    </SidebarProvider>
  );
}
