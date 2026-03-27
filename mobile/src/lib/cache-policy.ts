export const CACHE_TTL_MS = {
  business: 30 * 60 * 1000,
  dashboard: 2 * 60 * 1000,
  inventoryDetail: 5 * 60 * 1000,
  inventoryList: 5 * 60 * 1000,
  invoiceDetail: 5 * 60 * 1000,
  invoiceList: 5 * 60 * 1000,
  partyDetail: 10 * 60 * 1000,
  partyList: 10 * 60 * 1000,
  paymentDetail: 5 * 60 * 1000,
  paymentList: 5 * 60 * 1000,
  stockMovements: 5 * 60 * 1000,
} as const;

export function isCacheStale(updatedAt: number | null | undefined, ttlMs: number) {
  if (!updatedAt) {
    return true;
  }

  return Date.now() - updatedAt > ttlMs;
}

export function formatCacheAge(updatedAt: number | null | undefined) {
  if (!updatedAt) {
    return 'no-ts';
  }

  const seconds = Math.max(0, Math.floor((Date.now() - updatedAt) / 1000));

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  return `${minutes}m`;
}
