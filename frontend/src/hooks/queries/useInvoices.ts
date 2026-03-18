import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoiceService } from "@/services/invoice.service";
import type { ListInvoicesQuery, CreateInvoiceInput, CancelInvoiceInput } from "@/types/invoice";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-handler";

export const invoiceKeys = {
  all: ["invoices"] as const,
  lists: () => [...invoiceKeys.all, "list"] as const,
  list: (businessId: string, filters?: ListInvoicesQuery) => 
    [...invoiceKeys.lists(), businessId, filters] as const,
  details: () => [...invoiceKeys.all, "detail"] as const,
  detail: (businessId: string, invoiceId: string) => 
    [...invoiceKeys.details(), businessId, invoiceId] as const,
};

export function useInvoices(businessId: string | undefined, query?: ListInvoicesQuery) {
  return useQuery({
    queryKey: invoiceKeys.list(businessId!, query),
    queryFn: () => invoiceService.listInvoices(businessId!, query),
    enabled: !!businessId,
  });
}

export function useInvoice(businessId: string | undefined, invoiceId: string | undefined) {
  return useQuery({
    queryKey: invoiceKeys.detail(businessId!, invoiceId!),
    queryFn: () => invoiceService.getInvoice(businessId!, invoiceId!),
    enabled: !!businessId && !!invoiceId,
  });
}

export function useCreateSalesInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInvoiceInput) => invoiceService.createSalesInvoice(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      toast.success("Sales invoice created successfully");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useCreatePurchaseInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInvoiceInput) => invoiceService.createPurchaseInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      toast.success("Purchase invoice created successfully");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useCancelInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ businessId, invoiceId, data }: { 
      businessId: string; 
      invoiceId: string; 
      data: CancelInvoiceInput 
    }) => invoiceService.cancelInvoice(businessId, invoiceId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ 
        queryKey: invoiceKeys.detail(variables.businessId, variables.invoiceId) 
      });
      toast.success("Invoice cancelled successfully");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
