import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { inventoryService } from "@/services/inventory.service";
import type { CreateInventoryInput, UpdateInventoryInput, AdjustStockInput, ListInventoryQuery } from "@/types/inventory";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-handler";

export const inventoryKeys = {
  all: ["inventory"] as const,
  lists: () => [...inventoryKeys.all, "list"] as const,
  list: (businessId: string, filters?: ListInventoryQuery) => 
    [...inventoryKeys.lists(), businessId, filters] as const,
  details: () => [...inventoryKeys.all, "detail"] as const,
  detail: (businessId: string, itemId: string) => 
    [...inventoryKeys.details(), businessId, itemId] as const,
  movements: () => [...inventoryKeys.all, "movements"] as const,
  movementsList: (businessId: string, itemId?: string) => 
    [...inventoryKeys.movements(), businessId, itemId] as const,
};

export function useInventoryItems(businessId: string | undefined, query?: ListInventoryQuery) {
  return useQuery({
    queryKey: inventoryKeys.list(businessId!, query),
    queryFn: () => inventoryService.listItems(businessId!, query),
    enabled: !!businessId,
  });
}

export function useInventoryItem(businessId: string | undefined, itemId: string | undefined) {
  return useQuery({
    queryKey: inventoryKeys.detail(businessId!, itemId!),
    queryFn: () => inventoryService.getItem(businessId!, itemId!),
    enabled: !!businessId && !!itemId,
  });
}

export function useStockMovements(businessId: string | undefined, itemId?: string) {
  return useQuery({
    queryKey: inventoryKeys.movementsList(businessId!, itemId),
    queryFn: () => inventoryService.listStockMovements(businessId!, itemId),
    enabled: !!businessId,
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ businessId, data }: { businessId: string; data: CreateInventoryInput }) => 
      inventoryService.createItem(businessId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      toast.success("Inventory item created successfully");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ businessId, itemId, data }: { 
      businessId: string; 
      itemId: string; 
      data: UpdateInventoryInput 
    }) => inventoryService.updateItem(businessId, itemId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      queryClient.invalidateQueries({ 
        queryKey: inventoryKeys.detail(variables.businessId, variables.itemId) 
      });
      toast.success("Inventory item updated successfully");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ businessId, itemId, data }: { 
      businessId: string; 
      itemId: string; 
      data: AdjustStockInput 
    }) => inventoryService.adjustStock(businessId, itemId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      queryClient.invalidateQueries({ 
        queryKey: inventoryKeys.detail(variables.businessId, variables.itemId) 
      });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.movements() });
      toast.success("Stock adjusted successfully");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ businessId, itemId }: { businessId: string; itemId: string }) => 
      inventoryService.deleteItem(businessId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      toast.success("Inventory item deleted successfully");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
