import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { partyService } from "@/services/party.service";
import type { CreatePartyInput, UpdatePartyInput, ListPartiesQuery } from "@/types/party";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-handler";

export const partyKeys = {
  all: ["parties"] as const,
  lists: () => [...partyKeys.all, "list"] as const,
  list: (businessId: string, filters?: ListPartiesQuery) => 
    [...partyKeys.lists(), businessId, filters] as const,
  details: () => [...partyKeys.all, "detail"] as const,
  detail: (businessId: string, partyId: string) => 
    [...partyKeys.details(), businessId, partyId] as const,
};

export function useParties(businessId: string | undefined, query?: ListPartiesQuery) {
  return useQuery({
    queryKey: partyKeys.list(businessId!, query),
    queryFn: () => partyService.listParties(businessId!, query),
    enabled: !!businessId,
  });
}

export function useParty(businessId: string | undefined, partyId: string | undefined) {
  return useQuery({
    queryKey: partyKeys.detail(businessId!, partyId!),
    queryFn: () => partyService.getParty(businessId!, partyId!),
    enabled: !!businessId && !!partyId,
  });
}

export function useCreateParty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ businessId, data }: { businessId: string; data: CreatePartyInput }) => 
      partyService.createParty(businessId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partyKeys.lists() });
      toast.success("Party created successfully");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useUpdateParty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ businessId, partyId, data }: { 
      businessId: string; 
      partyId: string; 
      data: UpdatePartyInput 
    }) => partyService.updateParty(businessId, partyId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: partyKeys.lists() });
      queryClient.invalidateQueries({ 
        queryKey: partyKeys.detail(variables.businessId, variables.partyId) 
      });
      toast.success("Party updated successfully");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useDeleteParty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ businessId, partyId }: { businessId: string; partyId: string }) => 
      partyService.deleteParty(businessId, partyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partyKeys.lists() });
      toast.success("Party deleted successfully");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
