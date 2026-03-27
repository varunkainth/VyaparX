import type { BusinessWithRole } from '@/types/business';
import type { DashboardData } from '@/types/dashboard';
import type { InventoryItem, StockMovement } from '@/types/inventory';
import type { Invoice, InvoiceWithItems } from '@/types/invoice';
import type { Party } from '@/types/party';
import type { Payment, PaymentWithAllocations } from '@/types/payment';

type CachedPayload<T> = {
  data: T;
  updatedAt: number;
};

type BusinessCachePayload = {
  activeBusinessId: string | null;
  businesses: BusinessWithRole[];
  currentBusiness: BusinessWithRole | null;
};

const memoryStore = new Map<string, string>();

function getStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }

  return {
    getItem: (key: string) => memoryStore.get(key) ?? null,
    removeItem: (key: string) => {
      memoryStore.delete(key);
    },
    setItem: (key: string, value: string) => {
      memoryStore.set(key, value);
    },
  };
}

function buildKey(scope: string, parts: Array<string | number | boolean>) {
  return ['vyaparx-cache', scope, ...parts.map(String)].join(':');
}

function readCache<T>(key: string): CachedPayload<T> | null {
  const raw = getStorage().getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as CachedPayload<T>;
  } catch {
    getStorage().removeItem(key);
    return null;
  }
}

function writeCache<T>(key: string, data: T) {
  getStorage().setItem(
    key,
    JSON.stringify({
      data,
      updatedAt: Date.now(),
    } satisfies CachedPayload<T>),
  );
}

function clearByPrefix(prefix: string) {
  const storage = getStorage();

  if ('length' in storage && typeof storage.length === 'number' && 'key' in storage) {
    const keys: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(prefix)) {
        keys.push(key);
      }
    }
    keys.forEach((key) => storage.removeItem(key));
    return;
  }

  Array.from(memoryStore.keys())
    .filter((key) => key.startsWith(prefix))
    .forEach((key) => memoryStore.delete(key));
}

export async function loadBusinessCache() {
  return readCache<BusinessCachePayload>(buildKey('business', ['state']));
}

export async function saveBusinessCache(payload: BusinessCachePayload) {
  writeCache(buildKey('business', ['state']), payload);
}

export async function clearBusinessCache() {
  clearByPrefix(buildKey('business', []));
}

export async function loadDashboardCache(businessId: string) {
  return readCache<DashboardData>(buildKey('dashboard', [businessId]));
}

export async function saveDashboardCache(businessId: string, data: DashboardData) {
  writeCache(buildKey('dashboard', [businessId]), data);
}

export async function clearDashboardCache() {
  clearByPrefix(buildKey('dashboard', []));
}

export async function loadInvoiceListCache(businessId: string, includeCancelled: boolean) {
  return readCache<Invoice[]>(buildKey('invoice-list', [businessId, includeCancelled]));
}

export async function saveInvoiceListCache(businessId: string, includeCancelled: boolean, items: Invoice[]) {
  writeCache(buildKey('invoice-list', [businessId, includeCancelled]), items);
}

export async function loadInvoiceDetailCache(invoiceId: string) {
  return readCache<InvoiceWithItems>(buildKey('invoice-detail', [invoiceId]));
}

export async function saveInvoiceDetailCache(_businessId: string, invoiceId: string, invoice: InvoiceWithItems) {
  writeCache(buildKey('invoice-detail', [invoiceId]), invoice);
}

export async function clearInvoiceCache() {
  clearByPrefix(buildKey('invoice', []));
  clearByPrefix(buildKey('invoice-list', []));
  clearByPrefix(buildKey('invoice-detail', []));
}

export async function loadPartyListCache(businessId: string, includeInactive: boolean) {
  return readCache<Party[]>(buildKey('party-list', [businessId, includeInactive]));
}

export async function savePartyListCache(businessId: string, includeInactive: boolean, items: Party[]) {
  writeCache(buildKey('party-list', [businessId, includeInactive]), items);
}

export async function loadPartyDetailCache(partyId: string) {
  return readCache<Party>(buildKey('party-detail', [partyId]));
}

export async function savePartyDetailCache(_businessId: string, partyId: string, party: Party) {
  writeCache(buildKey('party-detail', [partyId]), party);
}

export async function clearPartyCache() {
  clearByPrefix(buildKey('party', []));
  clearByPrefix(buildKey('party-list', []));
  clearByPrefix(buildKey('party-detail', []));
}

export async function loadPaymentListCache(businessId: string, onlyUnreconciled: boolean) {
  return readCache<Payment[]>(buildKey('payment-list', [businessId, onlyUnreconciled]));
}

export async function savePaymentListCache(businessId: string, onlyUnreconciled: boolean, items: Payment[]) {
  writeCache(buildKey('payment-list', [businessId, onlyUnreconciled]), items);
}

export async function loadPaymentDetailCache(paymentId: string) {
  return readCache<PaymentWithAllocations>(buildKey('payment-detail', [paymentId]));
}

export async function savePaymentDetailCache(_businessId: string, paymentId: string, payment: PaymentWithAllocations) {
  writeCache(buildKey('payment-detail', [paymentId]), payment);
}

export async function clearPaymentCache() {
  clearByPrefix(buildKey('payment', []));
  clearByPrefix(buildKey('payment-list', []));
  clearByPrefix(buildKey('payment-detail', []));
}

export async function loadInventoryListCache(businessId: string, includeInactive: boolean) {
  return readCache<InventoryItem[]>(buildKey('inventory-list', [businessId, includeInactive]));
}

export async function saveInventoryListCache(businessId: string, includeInactive: boolean, items: InventoryItem[]) {
  writeCache(buildKey('inventory-list', [businessId, includeInactive]), items);
}

export async function loadInventoryDetailCache(itemId: string) {
  return readCache<InventoryItem>(buildKey('inventory-detail', [itemId]));
}

export async function saveInventoryDetailCache(_businessId: string, itemId: string, item: InventoryItem) {
  writeCache(buildKey('inventory-detail', [itemId]), item);
}

export async function loadStockMovementCache(itemId: string) {
  return readCache<StockMovement[]>(buildKey('stock-movement', [itemId]));
}

export async function saveStockMovementCache(_businessId: string, itemId: string, movements: StockMovement[]) {
  writeCache(buildKey('stock-movement', [itemId]), movements);
}

export async function clearInventoryCache() {
  clearByPrefix(buildKey('inventory', []));
  clearByPrefix(buildKey('inventory-list', []));
  clearByPrefix(buildKey('inventory-detail', []));
  clearByPrefix(buildKey('stock-movement', []));
}

export type { CachedPayload };
