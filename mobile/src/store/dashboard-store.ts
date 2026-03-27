import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { CACHE_TTL_MS, isCacheStale } from '@/lib/cache-policy';
import { clearDashboardCache, loadDashboardCache, saveDashboardCache } from '@/lib/cache-db';
import { persistStorage } from '@/lib/persist-storage';
import { dashboardService } from '@/services/dashboard.service';
import type { DashboardData } from '@/types/dashboard';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface DashboardState {
  dataByBusinessId: Record<string, DashboardData | undefined>;
  errorByBusinessId: Record<string, string | undefined>;
  statusByBusinessId: Record<string, LoadStatus | undefined>;
  updatedAtByBusinessId: Record<string, number | undefined>;
}

interface DashboardActions {
  clearDashboardState: () => void;
  ensureDashboard: (businessId: string, force?: boolean) => Promise<DashboardData>;
}

const initialState: DashboardState = {
  dataByBusinessId: {},
  errorByBusinessId: {},
  statusByBusinessId: {},
  updatedAtByBusinessId: {},
};

function formatDashboardError(error: any) {
  return (
    error?.response?.data?.error?.message ??
    error?.response?.data?.message ??
    (error instanceof Error ? error.message : 'Unable to load the business dashboard.')
  );
}

export const useDashboardStore = create<DashboardState & DashboardActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      clearDashboardState: () => {
        set(initialState);
        void clearDashboardCache();
      },

      ensureDashboard: async (businessId, force = false) => {
        const currentStatus = get().statusByBusinessId[businessId];
        const cached = get().dataByBusinessId[businessId];
        const updatedAt = get().updatedAtByBusinessId[businessId];

        if (!force && cached && currentStatus === 'ready' && !isCacheStale(updatedAt, CACHE_TTL_MS.dashboard)) {
          return cached;
        }
        if (!force && cached && currentStatus === 'ready') {
          void get().ensureDashboard(businessId, true);
          return cached;
        }

        if (!force && !cached) {
          const sqliteCached = await loadDashboardCache(businessId);
          if (sqliteCached) {
            set((state) => ({
              dataByBusinessId: { ...state.dataByBusinessId, [businessId]: sqliteCached.data },
              statusByBusinessId: { ...state.statusByBusinessId, [businessId]: 'ready' },
              updatedAtByBusinessId: { ...state.updatedAtByBusinessId, [businessId]: sqliteCached.updatedAt },
            }));
            if (isCacheStale(sqliteCached.updatedAt, CACHE_TTL_MS.dashboard)) {
              void get().ensureDashboard(businessId, true);
            }
            return sqliteCached.data;
          }
        }

        set((state) => ({
          errorByBusinessId: { ...state.errorByBusinessId, [businessId]: undefined },
          statusByBusinessId: { ...state.statusByBusinessId, [businessId]: 'loading' },
        }));

        try {
          const data = await dashboardService.getDashboard(businessId);

          set((state) => ({
            dataByBusinessId: { ...state.dataByBusinessId, [businessId]: data },
            statusByBusinessId: { ...state.statusByBusinessId, [businessId]: 'ready' },
            updatedAtByBusinessId: { ...state.updatedAtByBusinessId, [businessId]: Date.now() },
          }));
          await saveDashboardCache(businessId, data);

          return data;
        } catch (error) {
          set((state) => ({
            errorByBusinessId: { ...state.errorByBusinessId, [businessId]: formatDashboardError(error) },
            statusByBusinessId: { ...state.statusByBusinessId, [businessId]: 'error' },
          }));
          throw error;
        }
      },
    }),
    {
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<DashboardState & DashboardActions>),
        errorByBusinessId: {},
        statusByBusinessId: {},
      }),
      name: 'vyaparx_mobile_dashboard',
      partialize: (state) => ({
        dataByBusinessId: state.dataByBusinessId,
        updatedAtByBusinessId: state.updatedAtByBusinessId,
      }),
      storage: createJSONStorage(() => persistStorage),
    }
  )
);
