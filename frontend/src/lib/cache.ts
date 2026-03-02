// Simple in-memory cache with TTL support

interface CacheItem<T> {
  value: T;
  expiresAt: number;
}

class Cache {
  private cache = new Map<string, CacheItem<any>>();

  set<T>(key: string, value: T, ttl: number = 5 * 60 * 1000): void {
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { value, expiresAt });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value as T;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    
    if (!item) return false;
    
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired items
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache size
  size(): number {
    return this.cache.size;
  }
}

export const cache = new Cache();

// Run cleanup every 5 minutes
if (typeof window !== "undefined") {
  setInterval(() => cache.cleanup(), 5 * 60 * 1000);
}
