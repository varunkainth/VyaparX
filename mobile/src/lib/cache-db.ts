import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import type { BusinessWithRole } from '@/types/business';
import type { DashboardData } from '@/types/dashboard';
import type { InventoryItem, StockMovement } from '@/types/inventory';
import type { Invoice, InvoiceWithItems } from '@/types/invoice';
import type { Party } from '@/types/party';
import type { Payment, PaymentWithAllocations } from '@/types/payment';

let databasePromise: Promise<SQLiteDatabase> | null = null;

type PayloadRow = {
  payload: string;
  updated_at?: string;
};

export type CachedPayload<T> = {
  data: T;
  updatedAt: number;
};

async function getCacheDatabase() {
  if (!databasePromise) {
    databasePromise = (async () => {
      const db = await openDatabaseAsync('vyaparx-cache.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS business_cache (
          cache_key TEXT PRIMARY KEY NOT NULL,
          payload TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS dashboard_cache (
          business_id TEXT PRIMARY KEY NOT NULL,
          payload TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS invoice_list_cache (
          business_id TEXT NOT NULL,
          include_cancelled INTEGER NOT NULL,
          payload TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (business_id, include_cancelled)
        );

        CREATE TABLE IF NOT EXISTS invoice_detail_cache (
          invoice_id TEXT PRIMARY KEY NOT NULL,
          business_id TEXT NOT NULL,
          payload TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS party_list_cache (
          business_id TEXT NOT NULL,
          include_inactive INTEGER NOT NULL,
          payload TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (business_id, include_inactive)
        );

        CREATE TABLE IF NOT EXISTS party_detail_cache (
          party_id TEXT PRIMARY KEY NOT NULL,
          business_id TEXT NOT NULL,
          payload TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS payment_list_cache (
          business_id TEXT NOT NULL,
          only_unreconciled INTEGER NOT NULL,
          payload TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (business_id, only_unreconciled)
        );

        CREATE TABLE IF NOT EXISTS payment_detail_cache (
          payment_id TEXT PRIMARY KEY NOT NULL,
          business_id TEXT NOT NULL,
          payload TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS inventory_list_cache (
          business_id TEXT NOT NULL,
          include_inactive INTEGER NOT NULL,
          payload TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (business_id, include_inactive)
        );

        CREATE TABLE IF NOT EXISTS inventory_detail_cache (
          item_id TEXT PRIMARY KEY NOT NULL,
          business_id TEXT NOT NULL,
          payload TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS stock_movement_cache (
          item_id TEXT PRIMARY KEY NOT NULL,
          business_id TEXT NOT NULL,
          payload TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      return db;
    })();
  }

  return databasePromise;
}

function nowIso() {
  return new Date().toISOString();
}

function parsePayload<T>(row: PayloadRow | null) {
  if (!row?.payload) {
    return null;
  }

  try {
    return {
      data: JSON.parse(row.payload) as T,
      updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
    } satisfies CachedPayload<T>;
  } catch {
    return null;
  }
}

export async function loadBusinessCache() {
  const db = await getCacheDatabase();
  const row = await db.getFirstAsync<PayloadRow>(
    'SELECT payload, updated_at FROM business_cache WHERE cache_key = ?',
    'business_state'
  );
  return parsePayload<{
    activeBusinessId: string | null;
    businesses: BusinessWithRole[];
    currentBusiness: BusinessWithRole | null;
  }>(row);
}

export async function saveBusinessCache(payload: {
  activeBusinessId: string | null;
  businesses: BusinessWithRole[];
  currentBusiness: BusinessWithRole | null;
}) {
  const db = await getCacheDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO business_cache (cache_key, payload, updated_at)
     VALUES (?, ?, ?)`,
    'business_state',
    JSON.stringify(payload),
    nowIso()
  );
}

export async function clearBusinessCache() {
  const db = await getCacheDatabase();
  await db.runAsync('DELETE FROM business_cache WHERE cache_key = ?', 'business_state');
}

export async function loadDashboardCache(businessId: string) {
  const db = await getCacheDatabase();
  const row = await db.getFirstAsync<PayloadRow>(
    'SELECT payload, updated_at FROM dashboard_cache WHERE business_id = ?',
    businessId
  );
  return parsePayload<DashboardData>(row);
}

export async function saveDashboardCache(businessId: string, data: DashboardData) {
  const db = await getCacheDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO dashboard_cache (business_id, payload, updated_at)
     VALUES (?, ?, ?)`,
    businessId,
    JSON.stringify(data),
    nowIso()
  );
}

export async function clearDashboardCache() {
  const db = await getCacheDatabase();
  await db.execAsync('DELETE FROM dashboard_cache');
}

export async function loadInvoiceListCache(businessId: string, includeCancelled: boolean) {
  const db = await getCacheDatabase();
  const row = await db.getFirstAsync<PayloadRow>(
    'SELECT payload, updated_at FROM invoice_list_cache WHERE business_id = ? AND include_cancelled = ?',
    businessId,
    includeCancelled ? 1 : 0
  );
  return parsePayload<Invoice[]>(row);
}

export async function saveInvoiceListCache(businessId: string, includeCancelled: boolean, items: Invoice[]) {
  const db = await getCacheDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO invoice_list_cache (business_id, include_cancelled, payload, updated_at)
     VALUES (?, ?, ?, ?)`,
    businessId,
    includeCancelled ? 1 : 0,
    JSON.stringify(items),
    nowIso()
  );
}

export async function loadInvoiceDetailCache(invoiceId: string) {
  const db = await getCacheDatabase();
  const row = await db.getFirstAsync<PayloadRow>(
    'SELECT payload, updated_at FROM invoice_detail_cache WHERE invoice_id = ?',
    invoiceId
  );
  return parsePayload<InvoiceWithItems>(row);
}

export async function saveInvoiceDetailCache(businessId: string, invoiceId: string, invoice: InvoiceWithItems) {
  const db = await getCacheDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO invoice_detail_cache (invoice_id, business_id, payload, updated_at)
     VALUES (?, ?, ?, ?)`,
    invoiceId,
    businessId,
    JSON.stringify(invoice),
    nowIso()
  );
}

export async function clearInvoiceCache() {
  const db = await getCacheDatabase();
  await db.execAsync(`
    DELETE FROM invoice_list_cache;
    DELETE FROM invoice_detail_cache;
  `);
}

export async function loadPartyListCache(businessId: string, includeInactive: boolean) {
  const db = await getCacheDatabase();
  const row = await db.getFirstAsync<PayloadRow>(
    'SELECT payload, updated_at FROM party_list_cache WHERE business_id = ? AND include_inactive = ?',
    businessId,
    includeInactive ? 1 : 0
  );
  return parsePayload<Party[]>(row);
}

export async function savePartyListCache(businessId: string, includeInactive: boolean, items: Party[]) {
  const db = await getCacheDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO party_list_cache (business_id, include_inactive, payload, updated_at)
     VALUES (?, ?, ?, ?)`,
    businessId,
    includeInactive ? 1 : 0,
    JSON.stringify(items),
    nowIso()
  );
}

export async function loadPartyDetailCache(partyId: string) {
  const db = await getCacheDatabase();
  const row = await db.getFirstAsync<PayloadRow>(
    'SELECT payload, updated_at FROM party_detail_cache WHERE party_id = ?',
    partyId
  );
  return parsePayload<Party>(row);
}

export async function savePartyDetailCache(businessId: string, partyId: string, party: Party) {
  const db = await getCacheDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO party_detail_cache (party_id, business_id, payload, updated_at)
     VALUES (?, ?, ?, ?)`,
    partyId,
    businessId,
    JSON.stringify(party),
    nowIso()
  );
}

export async function clearPartyCache() {
  const db = await getCacheDatabase();
  await db.execAsync(`
    DELETE FROM party_list_cache;
    DELETE FROM party_detail_cache;
  `);
}

export async function loadPaymentListCache(businessId: string, onlyUnreconciled: boolean) {
  const db = await getCacheDatabase();
  const row = await db.getFirstAsync<PayloadRow>(
    'SELECT payload, updated_at FROM payment_list_cache WHERE business_id = ? AND only_unreconciled = ?',
    businessId,
    onlyUnreconciled ? 1 : 0
  );
  return parsePayload<Payment[]>(row);
}

export async function savePaymentListCache(businessId: string, onlyUnreconciled: boolean, items: Payment[]) {
  const db = await getCacheDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO payment_list_cache (business_id, only_unreconciled, payload, updated_at)
     VALUES (?, ?, ?, ?)`,
    businessId,
    onlyUnreconciled ? 1 : 0,
    JSON.stringify(items),
    nowIso()
  );
}

export async function loadPaymentDetailCache(paymentId: string) {
  const db = await getCacheDatabase();
  const row = await db.getFirstAsync<PayloadRow>(
    'SELECT payload, updated_at FROM payment_detail_cache WHERE payment_id = ?',
    paymentId
  );
  return parsePayload<PaymentWithAllocations>(row);
}

export async function savePaymentDetailCache(businessId: string, paymentId: string, payment: PaymentWithAllocations) {
  const db = await getCacheDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO payment_detail_cache (payment_id, business_id, payload, updated_at)
     VALUES (?, ?, ?, ?)`,
    paymentId,
    businessId,
    JSON.stringify(payment),
    nowIso()
  );
}

export async function clearPaymentCache() {
  const db = await getCacheDatabase();
  await db.execAsync(`
    DELETE FROM payment_list_cache;
    DELETE FROM payment_detail_cache;
  `);
}

export async function loadInventoryListCache(businessId: string, includeInactive: boolean) {
  const db = await getCacheDatabase();
  const row = await db.getFirstAsync<PayloadRow>(
    'SELECT payload, updated_at FROM inventory_list_cache WHERE business_id = ? AND include_inactive = ?',
    businessId,
    includeInactive ? 1 : 0
  );
  return parsePayload<InventoryItem[]>(row);
}

export async function saveInventoryListCache(businessId: string, includeInactive: boolean, items: InventoryItem[]) {
  const db = await getCacheDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO inventory_list_cache (business_id, include_inactive, payload, updated_at)
     VALUES (?, ?, ?, ?)`,
    businessId,
    includeInactive ? 1 : 0,
    JSON.stringify(items),
    nowIso()
  );
}

export async function loadInventoryDetailCache(itemId: string) {
  const db = await getCacheDatabase();
  const row = await db.getFirstAsync<PayloadRow>(
    'SELECT payload, updated_at FROM inventory_detail_cache WHERE item_id = ?',
    itemId
  );
  return parsePayload<InventoryItem>(row);
}

export async function saveInventoryDetailCache(businessId: string, itemId: string, item: InventoryItem) {
  const db = await getCacheDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO inventory_detail_cache (item_id, business_id, payload, updated_at)
     VALUES (?, ?, ?, ?)`,
    itemId,
    businessId,
    JSON.stringify(item),
    nowIso()
  );
}

export async function loadStockMovementCache(itemId: string) {
  const db = await getCacheDatabase();
  const row = await db.getFirstAsync<PayloadRow>(
    'SELECT payload, updated_at FROM stock_movement_cache WHERE item_id = ?',
    itemId
  );
  return parsePayload<StockMovement[]>(row);
}

export async function saveStockMovementCache(businessId: string, itemId: string, movements: StockMovement[]) {
  const db = await getCacheDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO stock_movement_cache (item_id, business_id, payload, updated_at)
     VALUES (?, ?, ?, ?)`,
    itemId,
    businessId,
    JSON.stringify(movements),
    nowIso()
  );
}

export async function clearInventoryCache() {
  const db = await getCacheDatabase();
  await db.execAsync(`
    DELETE FROM inventory_list_cache;
    DELETE FROM inventory_detail_cache;
    DELETE FROM stock_movement_cache;
  `);
}
