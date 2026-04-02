"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useBusinessStore } from "@/store/useBusinessStore";
import { useAuthStore } from "@/store/useAuthStore";
import { businessService } from "@/services/business.service";
import { authService } from "@/services/auth.service";
import { updateBusinessContext } from "@/lib/business-utils";

export const businessKeys = {
  all: ["businesses"] as const,
  list: (userId: string | undefined) =>
    [...businessKeys.all, userId ?? "anonymous"] as const,
};

/**
 * Hook to fetch and sync businesses from API
 */
export function useBusinesses(options?: { forceRefetch?: boolean }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userId = useAuthStore((state) => state.user?.id);
  const businesses = useBusinessStore((state) => state.businesses);
  const currentBusiness = useBusinessStore((state) => state.currentBusiness);
  const setBusinesses = useBusinessStore((state) => state.setBusinesses);
  const setCurrentBusiness = useBusinessStore(
    (state) => state.setCurrentBusiness,
  );
  const setLoading = useBusinessStore((state) => state.setLoading);
  const [isSwitchingBusiness, setIsSwitchingBusiness] = useState(false);
  const hasTriggeredForceRefetch = useRef(false);
  const switchInFlight = useRef(false);

  const query = useQuery({
    queryKey: businessKeys.list(userId),
    queryFn: () => businessService.listBusinesses(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    setLoading(query.isLoading || query.isFetching || isSwitchingBusiness);
  }, [query.isLoading, query.isFetching, isSwitchingBusiness, setLoading]);

  useEffect(() => {
    if (!isAuthenticated) {
      setBusinesses([]);
      setCurrentBusiness(null);
      switchInFlight.current = false;
      setIsSwitchingBusiness(false);
      return;
    }

    if (!query.data) {
      return;
    }

    setBusinesses(query.data);

    if (query.data.length === 0) {
      switchInFlight.current = false;
      setIsSwitchingBusiness(false);
      return;
    }

    if (currentBusiness) {
      const updatedCurrent = query.data.find(
        (business) => business.id === currentBusiness.id,
      );
      if (updatedCurrent) {
        setCurrentBusiness(updatedCurrent);
      }
      switchInFlight.current = false;
      setIsSwitchingBusiness(false);
      return;
    }

    if (switchInFlight.current) {
      return;
    }

    switchInFlight.current = true;
    setIsSwitchingBusiness(true);

    let isMounted = true;

    void (async () => {
      try {
        const response = await authService.switchBusiness({
          business_id: query.data[0].id,
        });

        if (!isMounted) {
          return;
        }

        updateBusinessContext(response.tokens, response.session, query.data[0]);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.error("[useBusinesses] Failed to switch business:", error);
        setCurrentBusiness(query.data[0]);
      } finally {
        if (isMounted) {
          switchInFlight.current = false;
          setIsSwitchingBusiness(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [
    currentBusiness,
    isAuthenticated,
    query.data,
    setBusinesses,
    setCurrentBusiness,
  ]);

  useEffect(() => {
    if (!options?.forceRefetch || hasTriggeredForceRefetch.current) {
      if (!options?.forceRefetch) {
        hasTriggeredForceRefetch.current = false;
      }
      return;
    }

    hasTriggeredForceRefetch.current = true;
    void query.refetch();
  }, [options?.forceRefetch, query.refetch]);

  return {
    businesses,
    isLoading: query.isLoading || query.isFetching || isSwitchingBusiness,
    refetch: query.refetch,
  };
}
