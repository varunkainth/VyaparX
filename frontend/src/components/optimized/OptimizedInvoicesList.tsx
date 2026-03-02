"use client"

import { useMemo } from "react";
import { useInvoices } from "@/hooks/queries/useInvoices";
import { useBusinessStore } from "@/store/useBusinessStore";
import { VirtualList } from "@/components/ui/virtual-list";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { ListSkeleton } from "@/components/ui/skeleton-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText } from "lucide-react";
import type { Invoice } from "@/types/invoice";

interface OptimizedInvoicesListProps {
  searchQuery?: string;
  invoiceTypeFilter?: string;
  paymentStatusFilter?: string;
  includeCancelled?: boolean;
}

export function OptimizedInvoicesList({
  searchQuery = "",
  invoiceTypeFilter = "all",
  paymentStatusFilter = "all",
  includeCancelled = false,
}: OptimizedInvoicesListProps) {
  const { currentBusiness } = useBusinessStore();
  
  const { data, isLoading, error } = useInvoices(currentBusiness?.id, {
    include_cancelled: includeCancelled,
    limit: 1000,
  });

  // Memoize filtered invoices to avoid recalculation
  const filteredInvoices = useMemo(() => {
    if (!data?.items) return [];

    return data.items.filter((invoice) => {
      const matchesSearch =
        !searchQuery ||
        invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.party_name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType =
        invoiceTypeFilter === "all" || invoice.invoice_type === invoiceTypeFilter;

      const matchesStatus =
        paymentStatusFilter === "all" || invoice.payment_status === paymentStatusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [data?.items, searchQuery, invoiceTypeFilter, paymentStatusFilter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const renderInvoiceItem = (invoice: Invoice, index: number) => (
    <Card className="mb-2">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{invoice.invoice_number}</span>
              <Badge variant={invoice.invoice_type === "sales" ? "default" : "secondary"}>
                {invoice.invoice_type}
              </Badge>
              <Badge
                variant={
                  invoice.payment_status === "paid"
                    ? "default"
                    : invoice.payment_status === "overdue"
                    ? "destructive"
                    : "secondary"
                }
              >
                {invoice.payment_status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{invoice.party_name}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">{formatCurrency(invoice.grand_total)}</p>
            <p className="text-sm text-muted-foreground">
              {new Date(invoice.invoice_date).toLocaleDateString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return <ListSkeleton count={5} type="invoice" />;
  }

  if (error) {
    return (
      <EmptyState
        icon={FileText}
        title="Error loading invoices"
        description="There was an error loading your invoices. Please try again."
      />
    );
  }

  if (filteredInvoices.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No invoices found"
        description={
          searchQuery || invoiceTypeFilter !== "all" || paymentStatusFilter !== "all"
            ? "Try adjusting your filters"
            : "Get started by creating your first invoice"
        }
      />
    );
  }

  return (
    <VirtualList
      items={filteredInvoices}
      itemHeight={100}
      containerHeight={600}
      renderItem={renderInvoiceItem}
      overscan={5}
      className="w-full"
    />
  );
}
