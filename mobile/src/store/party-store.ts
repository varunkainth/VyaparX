import { create } from 'zustand';

import { CACHE_TTL_MS, isCacheStale } from '@/lib/cache-policy';
import {
  clearPartyCache,
  loadPartyDetailCache,
  loadPartyListCache,
  savePartyDetailCache,
  savePartyListCache,
} from '@/lib/cache-db';
import { partyService } from '@/services/party.service';
import type { Party, UpdatePartyInput } from '@/types/party';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';
type PartyCacheKey = `${string}:inactive:${'true' | 'false'}`;

interface PartyCacheEntry {
  items: Party[];
  status: LoadStatus;
  error?: string;
  updatedAt?: number;
}

interface PartyState {
  cache: Record<PartyCacheKey, PartyCacheEntry | undefined>;
  detailById: Record<string, Party | undefined>;
  detailErrorById: Record<string, string | undefined>;
  detailStatusById: Record<string, LoadStatus | undefined>;
  detailUpdatedAtById: Record<string, number | undefined>;
}

interface PartyActions {
  clearPartyState: () => void;
  deleteParty: (businessId: string, partyId: string) => Promise<Party>;
  ensurePartyDetail: (businessId: string, partyId: string, force?: boolean) => Promise<Party>;
  ensureParties: (businessId: string, includeInactive: boolean, force?: boolean) => Promise<Party[]>;
  updateParty: (businessId: string, partyId: string, payload: UpdatePartyInput) => Promise<Party>;
}

const initialState: PartyState = {
  cache: {},
  detailById: {},
  detailErrorById: {},
  detailStatusById: {},
  detailUpdatedAtById: {},
};

export function getPartyCacheKey(businessId: string, includeInactive: boolean): PartyCacheKey {
  return `${businessId}:inactive:${includeInactive ? 'true' : 'false'}`;
}

function formatPartyError(error: any) {
  return (
    error instanceof Error ? error.message : 'Unable to load parties.'
  );
}

export const usePartyStore = create<PartyState & PartyActions>((set, get) => ({
  ...initialState,

  clearPartyState: () => {
    set(initialState);
    void clearPartyCache();
  },

  ensureParties: async (businessId, includeInactive, force = false) => {
    const key = getPartyCacheKey(businessId, includeInactive);
    const cached = get().cache[key];

    if (!force && cached?.status === 'ready' && !isCacheStale(cached.updatedAt, CACHE_TTL_MS.partyList)) {
      return cached.items;
    }
    if (!force && cached?.status === 'ready') {
      void get().ensureParties(businessId, includeInactive, true);
      return cached.items;
    }

    if (!force && !cached?.items.length) {
      const sqliteCached = await loadPartyListCache(businessId, includeInactive);
      if (sqliteCached?.data.length) {
        set((state) => ({
          cache: {
            ...state.cache,
            [key]: {
              items: sqliteCached.data,
              status: 'ready',
              updatedAt: sqliteCached.updatedAt,
            },
          },
        }));
        if (isCacheStale(sqliteCached.updatedAt, CACHE_TTL_MS.partyList)) {
          void get().ensureParties(businessId, includeInactive, true);
        }
        return sqliteCached.data;
      }
    }

    set((state) => ({
      cache: {
          ...state.cache,
          [key]: {
            items: cached?.items ?? [],
            status: 'loading',
            updatedAt: cached?.updatedAt,
          },
        },
      }));

    try {
      const parties = await partyService.listParties(businessId, {
        include_inactive: includeInactive ? 'true' : 'false',
      });

      set((state) => ({
        cache: {
          ...state.cache,
          [key]: {
            items: parties,
            status: 'ready',
            updatedAt: Date.now(),
          },
        },
      }));
      await savePartyListCache(businessId, includeInactive, parties);

      return parties;
    } catch (error) {
      set((state) => ({
        cache: {
          ...state.cache,
          [key]: {
            items: cached?.items ?? [],
            status: 'error',
            error: formatPartyError(error),
            updatedAt: cached?.updatedAt,
          },
        },
      }));
      throw error;
    }
  },

  ensurePartyDetail: async (businessId, partyId, force = false) => {
    const cached = get().detailById[partyId];
    const currentStatus = get().detailStatusById[partyId];

    if (!force && cached && currentStatus === 'ready' && !isCacheStale(get().detailUpdatedAtById[partyId], CACHE_TTL_MS.partyDetail)) {
      return cached;
    }
    if (!force && cached && currentStatus === 'ready') {
      void get().ensurePartyDetail(businessId, partyId, true);
      return cached;
    }

    if (!force && !cached) {
      const sqliteCached = await loadPartyDetailCache(partyId);
      if (sqliteCached) {
        set((state) => ({
          detailById: { ...state.detailById, [partyId]: sqliteCached.data },
          detailStatusById: { ...state.detailStatusById, [partyId]: 'ready' },
          detailUpdatedAtById: { ...state.detailUpdatedAtById, [partyId]: sqliteCached.updatedAt },
        }));
        if (isCacheStale(sqliteCached.updatedAt, CACHE_TTL_MS.partyDetail)) {
          void get().ensurePartyDetail(businessId, partyId, true);
        }
        return sqliteCached.data;
      }
    }

    set((state) => ({
      detailErrorById: { ...state.detailErrorById, [partyId]: undefined },
      detailStatusById: { ...state.detailStatusById, [partyId]: 'loading' },
    }));

    try {
      const party = await partyService.getParty(businessId, partyId);
      set((state) => ({
        detailById: { ...state.detailById, [partyId]: party },
        detailStatusById: { ...state.detailStatusById, [partyId]: 'ready' },
        detailUpdatedAtById: { ...state.detailUpdatedAtById, [partyId]: Date.now() },
      }));
      await savePartyDetailCache(businessId, partyId, party);
      return party;
    } catch (error) {
      set((state) => ({
        detailErrorById: { ...state.detailErrorById, [partyId]: formatPartyError(error) },
        detailStatusById: { ...state.detailStatusById, [partyId]: 'error' },
      }));
      throw error;
    }
  },

  updateParty: async (businessId, partyId, payload) => {
    const updated = await partyService.updateParty(businessId, partyId, payload);

    set((state) => ({
      cache: Object.fromEntries(
        Object.entries(state.cache).map(([key, entry]) => {
          if (!key.startsWith(`${businessId}:`) || !entry) {
            return [key, entry];
          }

          return [
            key,
            {
              ...entry,
              items: entry.items.map((item) => (item.id === partyId ? updated : item)),
            },
          ];
        })
      ),
      detailById: { ...state.detailById, [partyId]: updated },
      detailStatusById: { ...state.detailStatusById, [partyId]: 'ready' },
      detailUpdatedAtById: { ...state.detailUpdatedAtById, [partyId]: Date.now() },
    }));
    await savePartyDetailCache(businessId, partyId, updated);

    return updated;
  },

  deleteParty: async (businessId, partyId) => {
    const deleted = await partyService.deleteParty(businessId, partyId);

    set((state) => ({
      cache: Object.fromEntries(
        Object.entries(state.cache).map(([key, entry]) => {
          if (!key.startsWith(`${businessId}:`) || !entry) {
            return [key, entry];
          }

          return [
            key,
            {
              ...entry,
              items: entry.items.filter((item) => item.id !== partyId),
            },
          ];
        })
      ),
      detailById: { ...state.detailById, [partyId]: deleted },
      detailStatusById: { ...state.detailStatusById, [partyId]: 'ready' },
      detailUpdatedAtById: { ...state.detailUpdatedAtById, [partyId]: Date.now() },
    }));
    await savePartyDetailCache(businessId, partyId, deleted);

    return deleted;
  },
}));

export function selectPartyCache(businessId: string | null | undefined, includeInactive: boolean) {
  if (!businessId) {
    return undefined;
  }

  return usePartyStore.getState().cache[getPartyCacheKey(businessId, includeInactive)];
}
