import { create } from 'zustand';

import { CACHE_TTL_MS, isCacheStale } from '@/lib/cache-policy';
import {
  clearPaymentCache,
  loadPaymentDetailCache,
  loadPaymentListCache,
  savePaymentDetailCache,
  savePaymentListCache,
} from '@/lib/cache-db';
import { paymentService } from '@/services/payment.service';
import type { Payment, PaymentWithAllocations, ReconcilePaymentInput } from '@/types/payment';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';
type PaymentCacheKey = `${string}:unreconciled:${'true' | 'false'}`;

interface PaymentCacheEntry {
  items: Payment[];
  status: LoadStatus;
  error?: string;
  updatedAt?: number;
}

interface PaymentState {
  cache: Record<PaymentCacheKey, PaymentCacheEntry | undefined>;
  detailById: Record<string, PaymentWithAllocations | undefined>;
  detailErrorById: Record<string, string | undefined>;
  detailStatusById: Record<string, LoadStatus | undefined>;
  detailUpdatedAtById: Record<string, number | undefined>;
}

interface PaymentActions {
  clearPaymentState: () => void;
  ensurePaymentDetail: (businessId: string, paymentId: string, force?: boolean) => Promise<PaymentWithAllocations>;
  ensurePayments: (businessId: string, onlyUnreconciled: boolean, force?: boolean) => Promise<Payment[]>;
  reconcilePayment: (businessId: string, paymentId: string, payload: ReconcilePaymentInput) => Promise<Payment>;
  unreconcilePayment: (businessId: string, paymentId: string) => Promise<Payment>;
}

const initialState: PaymentState = {
  cache: {},
  detailById: {},
  detailErrorById: {},
  detailStatusById: {},
  detailUpdatedAtById: {},
};

export function getPaymentCacheKey(businessId: string, onlyUnreconciled: boolean): PaymentCacheKey {
  return `${businessId}:unreconciled:${onlyUnreconciled ? 'true' : 'false'}`;
}

function formatPaymentError(error: any) {
  return (
    error?.response?.data?.error?.message ??
    error?.response?.data?.message ??
    error?.message ??
    'Unable to load payments.'
  );
}

function patchPaymentInState(
  cache: PaymentState['cache'],
  detailById: PaymentState['detailById'],
  businessId: string,
  updated: Payment
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
            items: entry.items.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
          },
        ];
      })
    ),
    detailById: detailById[updated.id]
      ? {
          ...detailById,
          [updated.id]: {
            ...detailById[updated.id]!,
            ...updated,
          },
        }
      : detailById,
  };
}

export const usePaymentStore = create<PaymentState & PaymentActions>((set, get) => ({
  ...initialState,

  clearPaymentState: () => {
    set(initialState);
    void clearPaymentCache();
  },

  ensurePayments: async (businessId, onlyUnreconciled, force = false) => {
    const key = getPaymentCacheKey(businessId, onlyUnreconciled);
    const cached = get().cache[key];

    if (!force && cached?.status === 'ready' && !isCacheStale(cached.updatedAt, CACHE_TTL_MS.paymentList)) {
      return cached.items;
    }
    if (!force && cached?.status === 'ready') {
      void get().ensurePayments(businessId, onlyUnreconciled, true);
      return cached.items;
    }

    if (!force && !cached?.items.length) {
      const sqliteCached = await loadPaymentListCache(businessId, onlyUnreconciled);
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
        if (isCacheStale(sqliteCached.updatedAt, CACHE_TTL_MS.paymentList)) {
          void get().ensurePayments(businessId, onlyUnreconciled, true);
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
      const response = await paymentService.listPayments(businessId, {
        is_reconciled: onlyUnreconciled ? false : undefined,
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
      await savePaymentListCache(businessId, onlyUnreconciled, response.items);

      return response.items;
    } catch (error) {
      set((state) => ({
        cache: {
          ...state.cache,
          [key]: {
            items: cached?.items ?? [],
            status: 'error',
            error: formatPaymentError(error),
            updatedAt: cached?.updatedAt,
          },
        },
      }));
      throw error;
    }
  },

  ensurePaymentDetail: async (businessId, paymentId, force = false) => {
    const cached = get().detailById[paymentId];
    const currentStatus = get().detailStatusById[paymentId];

    if (!force && cached && currentStatus === 'ready' && !isCacheStale(get().detailUpdatedAtById[paymentId], CACHE_TTL_MS.paymentDetail)) {
      return cached;
    }
    if (!force && cached && currentStatus === 'ready') {
      void get().ensurePaymentDetail(businessId, paymentId, true);
      return cached;
    }

    if (!force && !cached) {
      const sqliteCached = await loadPaymentDetailCache(paymentId);
      if (sqliteCached) {
        set((state) => ({
          detailById: { ...state.detailById, [paymentId]: sqliteCached.data },
          detailStatusById: { ...state.detailStatusById, [paymentId]: 'ready' },
          detailUpdatedAtById: { ...state.detailUpdatedAtById, [paymentId]: sqliteCached.updatedAt },
        }));
        if (isCacheStale(sqliteCached.updatedAt, CACHE_TTL_MS.paymentDetail)) {
          void get().ensurePaymentDetail(businessId, paymentId, true);
        }
        return sqliteCached.data;
      }
    }

    set((state) => ({
      detailErrorById: { ...state.detailErrorById, [paymentId]: undefined },
      detailStatusById: { ...state.detailStatusById, [paymentId]: 'loading' },
    }));

    try {
      const payment = await paymentService.getPayment(businessId, paymentId);
      set((state) => ({
        detailById: { ...state.detailById, [paymentId]: payment },
        detailStatusById: { ...state.detailStatusById, [paymentId]: 'ready' },
        detailUpdatedAtById: { ...state.detailUpdatedAtById, [paymentId]: Date.now() },
      }));
      await savePaymentDetailCache(businessId, paymentId, payment);
      return payment;
    } catch (error) {
      set((state) => ({
        detailErrorById: { ...state.detailErrorById, [paymentId]: formatPaymentError(error) },
        detailStatusById: { ...state.detailStatusById, [paymentId]: 'error' },
      }));
      throw error;
    }
  },

  reconcilePayment: async (businessId, paymentId, payload) => {
    const updated = await paymentService.reconcilePayment(businessId, paymentId, payload);

    set((state) => {
      const patched = patchPaymentInState(state.cache, state.detailById, businessId, updated);
      return {
        ...patched,
        detailStatusById: { ...state.detailStatusById, [paymentId]: 'ready' },
        detailUpdatedAtById: { ...state.detailUpdatedAtById, [paymentId]: Date.now() },
      };
    });
    if (get().detailById[paymentId]) {
      await savePaymentDetailCache(businessId, paymentId, get().detailById[paymentId]!);
    }

    return updated;
  },

  unreconcilePayment: async (businessId, paymentId) => {
    const updated = await paymentService.unreconcilePayment(businessId, paymentId);

    set((state) => {
      const patched = patchPaymentInState(state.cache, state.detailById, businessId, updated);
      return {
        ...patched,
        detailStatusById: { ...state.detailStatusById, [paymentId]: 'ready' },
        detailUpdatedAtById: { ...state.detailUpdatedAtById, [paymentId]: Date.now() },
      };
    });
    if (get().detailById[paymentId]) {
      await savePaymentDetailCache(businessId, paymentId, get().detailById[paymentId]!);
    }

    return updated;
  },
}));
