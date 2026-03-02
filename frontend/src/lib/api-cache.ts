import { cache } from "./cache";

// API response cache wrapper
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 5 * 60 * 1000
): Promise<T> {
  // Check cache first
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch and cache
  const data = await fetcher();
  cache.set(key, data, ttl);
  return data;
}

// Invalidate cache by key pattern
export function invalidateCache(pattern: string): void {
  // This is a simple implementation
  // In production, you might want to use a more sophisticated pattern matching
  cache.clear();
}

// Prefetch data
export async function prefetchData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<void> {
  if (!cache.has(key)) {
    await cachedFetch(key, fetcher, ttl);
  }
}
