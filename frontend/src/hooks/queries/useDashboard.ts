import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboard.service";
import type { DashboardData } from "@/types/dashboard";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  detail: (businessId: string) => [...dashboardKeys.all, businessId] as const,
};

export function useDashboard(businessId: string | undefined) {
  return useQuery({
    queryKey: dashboardKeys.detail(businessId!),
    queryFn: () => dashboardService.getDashboardData(businessId!),
    enabled: !!businessId,
    staleTime: 2 * 60 * 1000, // 2 minutes - dashboard data should be relatively fresh
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}
