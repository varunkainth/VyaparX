"use client"

import { useMemo } from "react";
import { useParties } from "@/hooks/queries/useParties";
import { useBusinessStore } from "@/store/useBusinessStore";
import { VirtualList } from "@/components/ui/virtual-list";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListSkeleton } from "@/components/ui/skeleton-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { Users, Phone, Mail, MapPin } from "lucide-react";
import type { Party } from "@/types/party";

interface OptimizedPartiesListProps {
  searchQuery?: string;
  filterType?: "all" | "customer" | "supplier" | "both";
  includeInactive?: boolean;
  onPartyClick: (partyId: string) => void;
}

export function OptimizedPartiesList({
  searchQuery = "",
  filterType = "all",
  includeInactive = false,
  onPartyClick,
}: OptimizedPartiesListProps) {
  const { currentBusiness } = useBusinessStore();
  
  const { data, isLoading, error } = useParties(currentBusiness?.id, {
    include_inactive: includeInactive,
  });

  const filteredParties = useMemo(() => {
    if (!data) return [];

    return data.filter((party) => {
      const matchesSearch =
        !searchQuery ||
        party.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        party.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        party.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        party.gstin?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = filterType === "all" || party.party_type === filterType;

      return matchesSearch && matchesType;
    });
  }, [data, searchQuery, filterType]);

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(balance);
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

  const renderPartyItem = (party: Party, index: number) => (
    <Card className="mb-2 cursor-pointer" onClick={() => onPartyClick(party.id)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium truncate">{party.name}</span>
              <Badge variant={getPartyTypeColor(party.party_type)} className="capitalize">
                {party.party_type}
              </Badge>
              {!party.is_active && <Badge variant="secondary">Inactive</Badge>}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
              {party.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {party.phone}
                </span>
              )}
              {party.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {party.email}
                </span>
              )}
              {party.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {party.city}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Balance</p>
            <p
              className={`font-semibold ${
                party.current_balance > 0
                  ? "text-green-600"
                  : party.current_balance < 0
                  ? "text-red-600"
                  : ""
              }`}
            >
              {formatBalance(party.current_balance)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return <ListSkeleton count={5} type="party" />;
  }

  if (error) {
    return (
      <EmptyState
        icon={Users}
        title="Error loading parties"
        description="There was an error loading your parties. Please try again."
      />
    );
  }

  if (filteredParties.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No parties found"
        description={
          searchQuery || filterType !== "all"
            ? "Try adjusting your filters"
            : "Get started by adding your first party"
        }
      />
    );
  }

  return (
    <VirtualList
      items={filteredParties}
      itemHeight={100}
      containerHeight={600}
      renderItem={renderPartyItem}
      overscan={5}
      className="w-full"
    />
  );
}
