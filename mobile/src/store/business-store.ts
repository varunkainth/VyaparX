import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { CACHE_TTL_MS, isCacheStale } from '@/lib/cache-policy';
import { clearBusinessCache, loadBusinessCache, saveBusinessCache } from '@/lib/cache-db';
import { persistStorage } from '@/lib/persist-storage';
import { authService } from '@/services/auth.service';
import { businessService } from '@/services/business.service';
import { useAuthStore } from '@/store/auth-store';
import type { CreateBusinessInput, BusinessWithRole } from '@/types/business';

type LoadMode = 'idle' | 'loading' | 'ready' | 'error';

interface BusinessState {
  activeBusinessId: string | null;
  businesses: BusinessWithRole[];
  currentBusiness: BusinessWithRole | null;
  error: string | null;
  isCreatingBusiness: boolean;
  isSwitchingBusinessId: string | null;
  listStatus: LoadMode;
  updatedAt: number | null;
  currentStatus: LoadMode;
}

interface BusinessActions {
  bootstrapForSession: (businessId: string | null) => Promise<void>;
  clearBusinessState: () => void;
  createBusiness: (payload: CreateBusinessInput) => Promise<void>;
  ensureCurrentBusiness: (businessId: string, force?: boolean) => Promise<void>;
  ensureBusinesses: (force?: boolean) => Promise<void>;
  switchBusiness: (business: Pick<BusinessWithRole, 'id' | 'name'>) => Promise<void>;
  updateActiveBusiness: (payload: Partial<CreateBusinessInput>) => Promise<BusinessWithRole>;
}

const initialState: BusinessState = {
  activeBusinessId: null,
  businesses: [],
  currentBusiness: null,
  error: null,
  isCreatingBusiness: false,
  isSwitchingBusinessId: null,
  listStatus: 'idle',
  updatedAt: null,
  currentStatus: 'idle',
};

function formatBusinessError(error: any, fallback: string) {
  return (
    error?.response?.data?.error?.message ??
    error?.response?.data?.message ??
    (error instanceof Error ? error.message : fallback)
  );
}

function mergeBusinessRecord(
  businesses: BusinessWithRole[],
  nextBusiness: BusinessWithRole
) {
  const existingIndex = businesses.findIndex((business) => business.id === nextBusiness.id);

  if (existingIndex === -1) {
    return [nextBusiness, ...businesses];
  }

  return businesses.map((business, index) => (index === existingIndex ? { ...business, ...nextBusiness } : business));
}

export const useBusinessStore = create<BusinessState & BusinessActions>()(
  persist(
    (set, get) => ({
  ...initialState,

  clearBusinessState: () => {
    set(initialState);
    void clearBusinessCache();
  },

  ensureBusinesses: async (force = false) => {
    const state = get();

    if (!force && (state.listStatus === 'loading' || state.listStatus === 'ready')) {
      if (state.listStatus === 'ready' && !isCacheStale(state.updatedAt, CACHE_TTL_MS.business)) {
        return;
      }
      if (state.listStatus === 'ready') {
        void get().ensureBusinesses(true);
        return;
      }
      return;
    }

    if (!force && !state.businesses.length) {
      const cached = await loadBusinessCache();
      if (cached?.data.businesses?.length) {
        set({
          activeBusinessId: cached.data.activeBusinessId,
          businesses: cached.data.businesses,
          currentBusiness: cached.data.currentBusiness,
          listStatus: 'ready',
          updatedAt: cached.updatedAt,
        });
        if (isCacheStale(cached.updatedAt, CACHE_TTL_MS.business)) {
          void get().ensureBusinesses(true);
        }
        return;
      }
    }

    set({ error: null, listStatus: 'loading' });

    try {
      const businesses = await businessService.listBusinesses();
      const activeBusinessId = useAuthStore.getState().session?.business_id ?? null;
      const currentCandidate =
        (state.currentBusiness && businesses.find((business) => business.id === state.currentBusiness?.id)
          ? { ...businesses.find((business) => business.id === state.currentBusiness?.id)!, ...state.currentBusiness }
          : null) ??
        businesses.find((business) => business.id === activeBusinessId) ??
        null;

      set({
        activeBusinessId,
        businesses,
        currentBusiness: currentCandidate,
        listStatus: 'ready',
        updatedAt: Date.now(),
      });
      await saveBusinessCache({
        activeBusinessId,
        businesses,
        currentBusiness: currentCandidate,
      });
    } catch (error) {
      set({
        error: formatBusinessError(error, 'Unable to load businesses right now.'),
        listStatus: 'error',
      });
      throw error;
    }
  },

  ensureCurrentBusiness: async (businessId, force = false) => {
    const state = get();

    if (
      !force &&
      state.currentStatus === 'ready' &&
      state.currentBusiness?.id === businessId
    ) {
      return;
    }

    set({ activeBusinessId: businessId, error: null, currentStatus: 'loading' });

    try {
      const business = await businessService.getBusiness(businessId);

      set((current) => ({
        businesses: mergeBusinessRecord(current.businesses, business),
        currentBusiness: business,
        currentStatus: 'ready',
        updatedAt: Date.now(),
      }));
      const nextBusinesses = mergeBusinessRecord(get().businesses, business);
      await saveBusinessCache({
        activeBusinessId: businessId,
        businesses: nextBusinesses,
        currentBusiness: business,
      });
    } catch (error) {
      set({
        error: formatBusinessError(error, 'Unable to load the active business right now.'),
        currentStatus: 'error',
      });
      throw error;
    }
  },

  bootstrapForSession: async (businessId) => {
    if (!businessId) {
      set(initialState);
      return;
    }

    set({ activeBusinessId: businessId });

    await Promise.all([
      get().ensureBusinesses(true),
      get().ensureCurrentBusiness(businessId, true),
    ]);
  },

  switchBusiness: async (business) => {
    const businessId = business.id;
    const currentSessionBusinessId = useAuthStore.getState().session?.business_id ?? null;

    if (businessId === currentSessionBusinessId) {
      set({
        activeBusinessId: businessId,
        currentBusiness: get().currentBusiness?.id === businessId ? get().currentBusiness : get().businesses.find((item) => item.id === businessId) ?? null,
      });
      return;
    }

    set({ error: null, isSwitchingBusinessId: businessId });

    try {
      const response = await authService.switchBusiness(businessId);
      const authState = useAuthStore.getState();

      if (authState.user) {
        authState.setAuth(authState.user, response.tokens, response.session);
      } else {
        authState.setTokens(response.tokens);
        authState.setSession(response.session);
      }

      const listedBusiness = get().businesses.find((item) => item.id === businessId) ?? null;
      const nextCurrent = listedBusiness ?? (get().currentBusiness?.id === businessId ? get().currentBusiness : null);

      set({
        activeBusinessId: businessId,
        currentBusiness:
          nextCurrent && nextCurrent.id === businessId
            ? { ...nextCurrent, name: business.name }
            : get().businesses.find((item) => item.id === businessId) ?? null,
        currentStatus: 'idle',
      });

      await Promise.all([
        get().ensureBusinesses(true),
        get().ensureCurrentBusiness(businessId, true),
      ]);
    } catch (error) {
      set({ error: formatBusinessError(error, 'Unable to switch business right now.') });
      throw error;
    } finally {
      set({ isSwitchingBusinessId: null });
    }
  },

  createBusiness: async (payload) => {
    set({ error: null, isCreatingBusiness: true });

    try {
      const response = await businessService.createBusiness(payload);
      const authState = useAuthStore.getState();

      if (authState.user) {
        authState.setAuth(authState.user, response.tokens, response.session);
      } else {
        authState.setTokens(response.tokens);
        authState.setSession(response.session);
      }

      set((state) => ({
        activeBusinessId: response.business.id,
        businesses: mergeBusinessRecord(state.businesses, response.business),
        currentBusiness: response.business,
        currentStatus: 'ready',
        listStatus: 'ready',
        updatedAt: Date.now(),
      }));
      await saveBusinessCache({
        activeBusinessId: response.business.id,
        businesses: mergeBusinessRecord(get().businesses, response.business),
        currentBusiness: response.business,
      });
    } catch (error) {
      set({ error: formatBusinessError(error, 'Unable to create business right now.') });
      throw error;
    } finally {
      set({ isCreatingBusiness: false });
    }
  },

  updateActiveBusiness: async (payload) => {
    const businessId = useAuthStore.getState().session?.business_id;

    if (!businessId) {
      throw new Error('No active business selected.');
    }

    set({ error: null });

    try {
      const business = await businessService.updateBusiness(businessId, payload);

      set((state) => ({
        businesses: mergeBusinessRecord(state.businesses, business),
        currentBusiness: business,
        currentStatus: 'ready',
        updatedAt: Date.now(),
      }));
      await saveBusinessCache({
        activeBusinessId: businessId,
        businesses: mergeBusinessRecord(get().businesses, business),
        currentBusiness: business,
      });

      return business;
    } catch (error) {
      set({ error: formatBusinessError(error, 'Unable to update business right now.') });
      throw error;
    }
  },
    }),
    {
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<BusinessState & BusinessActions>),
        currentStatus: 'idle',
        error: null,
        isCreatingBusiness: false,
        isSwitchingBusinessId: null,
        listStatus: 'idle',
      }),
      name: 'vyaparx_mobile_business',
      partialize: (state) => ({
        activeBusinessId: state.activeBusinessId,
        businesses: state.businesses,
        currentBusiness: state.currentBusiness,
        updatedAt: state.updatedAt,
      }),
      storage: createJSONStorage(() => persistStorage),
    }
  )
);
