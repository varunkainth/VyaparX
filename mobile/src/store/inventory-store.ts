import { create } from 'zustand';

import { CACHE_TTL_MS, isCacheStale } from '@/lib/cache-policy';
import {
  clearInventoryCache,
  loadInventoryDetailCache,
  loadInventoryListCache,
  loadStockMovementCache,
  saveInventoryDetailCache,
  saveInventoryListCache,
  saveStockMovementCache,
} from '@/lib/cache-db';
import { inventoryService } from '@/services/inventory.service';
import type {
  AdjustInventoryStockBody,
  CreateInventoryBody,
  InventoryItem,
  StockMovement,
} from '@/types/inventory';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';
type InventoryCacheKey = `${string}:inactive:${'true' | 'false'}`;

interface InventoryCacheEntry {
  items: InventoryItem[];
  status: LoadStatus;
  error?: string;
  updatedAt?: number;
}

interface InventoryState {
  cache: Record<InventoryCacheKey, InventoryCacheEntry | undefined>;
  detailById: Record<string, InventoryItem | undefined>;
  detailErrorById: Record<string, string | undefined>;
  detailStatusById: Record<string, LoadStatus | undefined>;
  detailUpdatedAtById: Record<string, number | undefined>;
  movementsByItemId: Record<string, StockMovement[] | undefined>;
  movementsStatusByItemId: Record<string, LoadStatus | undefined>;
  movementsErrorByItemId: Record<string, string | undefined>;
  movementsUpdatedAtByItemId: Record<string, number | undefined>;
}

interface InventoryActions {
  clearInventoryState: () => void;
  deleteInventoryItem: (businessId: string, itemId: string) => Promise<InventoryItem>;
  ensureInventoryDetail: (businessId: string, itemId: string, force?: boolean) => Promise<InventoryItem>;
  ensureInventoryItems: (businessId: string, includeInactive: boolean, force?: boolean) => Promise<InventoryItem[]>;
  ensureStockMovements: (businessId: string, itemId: string, force?: boolean) => Promise<StockMovement[]>;
  updateInventoryItem: (businessId: string, itemId: string, payload: Partial<CreateInventoryBody>) => Promise<InventoryItem>;
  updateInventoryStock: (businessId: string, itemId: string, payload: AdjustInventoryStockBody) => Promise<void>;
}

const initialState: InventoryState = {
  cache: {},
  detailById: {},
  detailErrorById: {},
  detailStatusById: {},
  detailUpdatedAtById: {},
  movementsByItemId: {},
  movementsStatusByItemId: {},
  movementsErrorByItemId: {},
  movementsUpdatedAtByItemId: {},
};

export function getInventoryCacheKey(businessId: string, includeInactive: boolean): InventoryCacheKey {
  return `${businessId}:inactive:${includeInactive ? 'true' : 'false'}`;
}

function formatInventoryError(error: any) {
  return error instanceof Error ? error.message : 'Unable to load inventory.';
}

function patchInventoryInState(
  cache: InventoryState['cache'],
  detailById: InventoryState['detailById'],
  businessId: string,
  updated: InventoryItem
) {
  return {
    cache: Object.fromEntries(
      Object.entries(cache).map(([key, entry]) => {
        if (!key.startsWith(`${businessId}:`) || !entry) {
          return [key, entry];
        }

        return [
          key,
          {
            ...entry,
            items: entry.items.map((item) => (item.id === updated.id ? updated : item)),
          },
        ];
      })
    ),
    detailById: {
      ...detailById,
      [updated.id]: updated,
    },
  };
}

export const useInventoryStore = create<InventoryState & InventoryActions>((set, get) => ({
  ...initialState,

  clearInventoryState: () => {
    set(initialState);
    void clearInventoryCache();
  },

  ensureInventoryItems: async (businessId, includeInactive, force = false) => {
    const key = getInventoryCacheKey(businessId, includeInactive);
    const cached = get().cache[key];

    if (!force && cached?.status === 'ready' && !isCacheStale(cached.updatedAt, CACHE_TTL_MS.inventoryList)) {
      return cached.items;
    }
    if (!force && cached?.status === 'ready') {
      void get().ensureInventoryItems(businessId, includeInactive, true);
      return cached.items;
    }

    if (!force && !cached?.items.length) {
      const sqliteCached = await loadInventoryListCache(businessId, includeInactive);
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
        if (isCacheStale(sqliteCached.updatedAt, CACHE_TTL_MS.inventoryList)) {
          void get().ensureInventoryItems(businessId, includeInactive, true);
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
      const items = await inventoryService.listInventoryItems(businessId, {
        include_inactive: includeInactive ? 'true' : 'false',
      });

      set((state) => ({
        cache: {
          ...state.cache,
          [key]: {
            items,
            status: 'ready',
            updatedAt: Date.now(),
          },
        },
      }));
      await saveInventoryListCache(businessId, includeInactive, items);

      return items;
    } catch (error) {
      set((state) => ({
        cache: {
          ...state.cache,
          [key]: {
            items: cached?.items ?? [],
            status: 'error',
            error: formatInventoryError(error),
            updatedAt: cached?.updatedAt,
          },
        },
      }));
      throw error;
    }
  },

  ensureInventoryDetail: async (businessId, itemId, force = false) => {
    const cached = get().detailById[itemId];
    const currentStatus = get().detailStatusById[itemId];

    if (!force && cached && currentStatus === 'ready' && !isCacheStale(get().detailUpdatedAtById[itemId], CACHE_TTL_MS.inventoryDetail)) {
      return cached;
    }
    if (!force && cached && currentStatus === 'ready') {
      void get().ensureInventoryDetail(businessId, itemId, true);
      return cached;
    }

    if (!force && !cached) {
      const sqliteCached = await loadInventoryDetailCache(itemId);
      if (sqliteCached) {
        set((state) => ({
          detailById: { ...state.detailById, [itemId]: sqliteCached.data },
          detailStatusById: { ...state.detailStatusById, [itemId]: 'ready' },
          detailUpdatedAtById: { ...state.detailUpdatedAtById, [itemId]: sqliteCached.updatedAt },
        }));
        if (isCacheStale(sqliteCached.updatedAt, CACHE_TTL_MS.inventoryDetail)) {
          void get().ensureInventoryDetail(businessId, itemId, true);
        }
        return sqliteCached.data;
      }
    }

    set((state) => ({
      detailErrorById: { ...state.detailErrorById, [itemId]: undefined },
      detailStatusById: { ...state.detailStatusById, [itemId]: 'loading' },
    }));

    try {
      const item = await inventoryService.getInventoryItem(businessId, itemId);
      set((state) => ({
        detailById: { ...state.detailById, [itemId]: item },
        detailStatusById: { ...state.detailStatusById, [itemId]: 'ready' },
        detailUpdatedAtById: { ...state.detailUpdatedAtById, [itemId]: Date.now() },
      }));
      await saveInventoryDetailCache(businessId, itemId, item);
      return item;
    } catch (error) {
      set((state) => ({
        detailErrorById: { ...state.detailErrorById, [itemId]: formatInventoryError(error) },
        detailStatusById: { ...state.detailStatusById, [itemId]: 'error' },
      }));
      throw error;
    }
  },

  ensureStockMovements: async (businessId, itemId, force = false) => {
    const cached = get().movementsByItemId[itemId];
    const currentStatus = get().movementsStatusByItemId[itemId];

    if (!force && cached && currentStatus === 'ready' && !isCacheStale(get().movementsUpdatedAtByItemId[itemId], CACHE_TTL_MS.stockMovements)) {
      return cached;
    }
    if (!force && cached && currentStatus === 'ready') {
      void get().ensureStockMovements(businessId, itemId, true);
      return cached;
    }

    if (!force && !cached) {
      const sqliteCached = await loadStockMovementCache(itemId);
      if (sqliteCached?.data.length) {
        set((state) => ({
          movementsByItemId: { ...state.movementsByItemId, [itemId]: sqliteCached.data },
          movementsStatusByItemId: { ...state.movementsStatusByItemId, [itemId]: 'ready' },
          movementsUpdatedAtByItemId: { ...state.movementsUpdatedAtByItemId, [itemId]: sqliteCached.updatedAt },
        }));
        if (isCacheStale(sqliteCached.updatedAt, CACHE_TTL_MS.stockMovements)) {
          void get().ensureStockMovements(businessId, itemId, true);
        }
        return sqliteCached.data;
      }
    }

    set((state) => ({
      movementsErrorByItemId: { ...state.movementsErrorByItemId, [itemId]: undefined },
      movementsStatusByItemId: { ...state.movementsStatusByItemId, [itemId]: 'loading' },
    }));

    try {
      const movements = await inventoryService.listStockMovements(businessId, { item_id: itemId });
      set((state) => ({
        movementsByItemId: { ...state.movementsByItemId, [itemId]: movements },
        movementsStatusByItemId: { ...state.movementsStatusByItemId, [itemId]: 'ready' },
        movementsUpdatedAtByItemId: { ...state.movementsUpdatedAtByItemId, [itemId]: Date.now() },
      }));
      await saveStockMovementCache(businessId, itemId, movements);
      return movements;
    } catch (error) {
      set((state) => ({
        movementsErrorByItemId: { ...state.movementsErrorByItemId, [itemId]: formatInventoryError(error) },
        movementsStatusByItemId: { ...state.movementsStatusByItemId, [itemId]: 'error' },
      }));
      throw error;
    }
  },

  updateInventoryItem: async (businessId, itemId, payload) => {
    const updated = await inventoryService.updateInventoryItem(businessId, itemId, payload);

    set((state) => {
      const patched = patchInventoryInState(state.cache, state.detailById, businessId, updated);
      return {
        ...patched,
        detailStatusById: { ...state.detailStatusById, [itemId]: 'ready' },
        detailUpdatedAtById: { ...state.detailUpdatedAtById, [itemId]: Date.now() },
      };
    });
    await saveInventoryDetailCache(businessId, itemId, updated);

    return updated;
  },

  deleteInventoryItem: async (businessId, itemId) => {
    const deleted = await inventoryService.deleteInventoryItem(businessId, itemId);

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
              items: entry.items.filter((item) => item.id !== itemId),
            },
          ];
        })
      ),
      detailById: { ...state.detailById, [itemId]: deleted },
      detailStatusById: { ...state.detailStatusById, [itemId]: 'ready' },
      detailUpdatedAtById: { ...state.detailUpdatedAtById, [itemId]: Date.now() },
    }));
    await saveInventoryDetailCache(businessId, itemId, deleted);

    return deleted;
  },

  updateInventoryStock: async (businessId, itemId, payload) => {
    await inventoryService.adjustInventoryStock(businessId, itemId, payload);
    await Promise.all([
      get().ensureInventoryDetail(businessId, itemId, true),
      get().ensureStockMovements(businessId, itemId, true),
      get().ensureInventoryItems(businessId, false, true).catch(() => undefined),
      get().ensureInventoryItems(businessId, true, true).catch(() => undefined),
    ]);
  },
}));
