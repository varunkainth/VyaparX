import { create } from 'zustand';

import { CACHE_TTL_MS, isCacheStale } from '@/lib/cache-policy';
import {
  clearInvoiceCache,
  loadInvoiceDetailCache,
  loadInvoiceListCache,
  saveInvoiceDetailCache,
  saveInvoiceListCache,
} from '@/lib/cache-db';
import { invoiceService } from '@/services/invoice.service';
import type { CancelInvoiceInput, Invoice, InvoiceWithItems } from '@/types/invoice';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';
type InvoiceCacheKey = `${string}:cancelled:${'true' | 'false'}`;

interface InvoiceCacheEntry {
  items: Invoice[];
  status: LoadStatus;
  error?: string;
  updatedAt?: number;
}

interface InvoiceState {
  cache: Record<InvoiceCacheKey, InvoiceCacheEntry | undefined>;
  detailById: Record<string, InvoiceWithItems | undefined>;
  detailErrorById: Record<string, string | undefined>;
  detailStatusById: Record<string, LoadStatus | undefined>;
  detailUpdatedAtById: Record<string, number | undefined>;
}

interface InvoiceActions {
  cancelInvoice: (businessId: string, invoiceId: string, payload: CancelInvoiceInput) => Promise<Invoice>;
  clearInvoiceState: () => void;
  ensureInvoiceDetail: (businessId: string, invoiceId: string, force?: boolean) => Promise<InvoiceWithItems>;
  ensureInvoices: (businessId: string, includeCancelled: boolean, force?: boolean) => Promise<Invoice[]>;
}

const initialState: InvoiceState = {
  cache: {},
  detailById: {},
  detailErrorById: {},
  detailStatusById: {},
  detailUpdatedAtById: {},
};

export function getInvoiceCacheKey(businessId: string, includeCancelled: boolean): InvoiceCacheKey {
  return `${businessId}:cancelled:${includeCancelled ? 'true' : 'false'}`;
}

function formatInvoiceError(error: any) {
  return (
    error?.response?.data?.error?.message ??
    error?.response?.data?.message ??
    error?.message ??
    'Unable to load invoices.'
  );
}

export const useInvoiceStore = create<InvoiceState & InvoiceActions>((set, get) => ({
  ...initialState,

  clearInvoiceState: () => {
    set(initialState);
    void clearInvoiceCache();
  },

  ensureInvoices: async (businessId, includeCancelled, force = false) => {
    const key = getInvoiceCacheKey(businessId, includeCancelled);
    const cached = get().cache[key];

    if (!force && cached?.status === 'ready' && !isCacheStale(cached.updatedAt, CACHE_TTL_MS.invoiceList)) {
      return cached.items;
    }
    if (!force && cached?.status === 'ready') {
      void get().ensureInvoices(businessId, includeCancelled, true);
      return cached.items;
    }

    if (!force && !cached?.items.length) {
      const sqliteCached = await loadInvoiceListCache(businessId, includeCancelled);
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
        if (isCacheStale(sqliteCached.updatedAt, CACHE_TTL_MS.invoiceList)) {
          void get().ensureInvoices(businessId, includeCancelled, true);
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
      const response = await invoiceService.listInvoices(businessId, {
        include_cancelled: includeCancelled,
        limit: 100,
      });

      set((state) => ({
        cache: {
          ...state.cache,
          [key]: {
            items: response.items,
            status: 'ready',
            updatedAt: Date.now(),
          },
        },
      }));
      await saveInvoiceListCache(businessId, includeCancelled, response.items);

      return response.items;
    } catch (error) {
      set((state) => ({
        cache: {
          ...state.cache,
          [key]: {
            items: cached?.items ?? [],
            status: 'error',
            error: formatInvoiceError(error),
            updatedAt: cached?.updatedAt,
          },
        },
      }));
      throw error;
    }
  },

  ensureInvoiceDetail: async (businessId, invoiceId, force = false) => {
    const cached = get().detailById[invoiceId];
    const currentStatus = get().detailStatusById[invoiceId];

    if (!force && cached && currentStatus === 'ready' && !isCacheStale(get().detailUpdatedAtById[invoiceId], CACHE_TTL_MS.invoiceDetail)) {
      return cached;
    }
    if (!force && cached && currentStatus === 'ready') {
      void get().ensureInvoiceDetail(businessId, invoiceId, true);
      return cached;
    }

    if (!force && !cached) {
      const sqliteCached = await loadInvoiceDetailCache(invoiceId);
      if (sqliteCached) {
        set((state) => ({
          detailById: { ...state.detailById, [invoiceId]: sqliteCached.data },
          detailStatusById: { ...state.detailStatusById, [invoiceId]: 'ready' },
          detailUpdatedAtById: { ...state.detailUpdatedAtById, [invoiceId]: sqliteCached.updatedAt },
        }));
        if (isCacheStale(sqliteCached.updatedAt, CACHE_TTL_MS.invoiceDetail)) {
          void get().ensureInvoiceDetail(businessId, invoiceId, true);
        }
        return sqliteCached.data;
      }
    }

    set((state) => ({
      detailErrorById: { ...state.detailErrorById, [invoiceId]: undefined },
      detailStatusById: { ...state.detailStatusById, [invoiceId]: 'loading' },
    }));

    try {
      const invoice = await invoiceService.getInvoice(businessId, invoiceId);
      set((state) => ({
        detailById: { ...state.detailById, [invoiceId]: invoice },
        detailStatusById: { ...state.detailStatusById, [invoiceId]: 'ready' },
        detailUpdatedAtById: { ...state.detailUpdatedAtById, [invoiceId]: Date.now() },
      }));
      await saveInvoiceDetailCache(businessId, invoiceId, invoice);
      return invoice;
    } catch (error) {
      set((state) => ({
        detailErrorById: { ...state.detailErrorById, [invoiceId]: formatInvoiceError(error) },
        detailStatusById: { ...state.detailStatusById, [invoiceId]: 'error' },
      }));
      throw error;
    }
  },

  cancelInvoice: async (businessId, invoiceId, payload) => {
    const invoice = await invoiceService.cancelInvoice(businessId, invoiceId, payload);

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
              items: entry.items.map((item) => (item.id === invoiceId ? { ...item, ...invoice } : item)),
            },
          ];
        })
      ),
      detailById: state.detailById[invoiceId]
        ? {
            ...state.detailById,
            [invoiceId]: {
              ...state.detailById[invoiceId]!,
              ...invoice,
            },
          }
        : state.detailById,
      detailStatusById: { ...state.detailStatusById, [invoiceId]: 'ready' },
      detailUpdatedAtById: { ...state.detailUpdatedAtById, [invoiceId]: Date.now() },
    }));
    if (get().detailById[invoiceId]) {
      void saveInvoiceDetailCache(businessId, invoiceId, get().detailById[invoiceId]!);
    }

    return invoice;
  },
}));

export function selectInvoiceCache(businessId: string | null | undefined, includeCancelled: boolean) {
  if (!businessId) {
    return undefined;
  }

  return useInvoiceStore.getState().cache[getInvoiceCacheKey(businessId, includeCancelled)];
}
