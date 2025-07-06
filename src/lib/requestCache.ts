interface CacheEntry<T> {
  data: T;
  timestamp: number;
  promise?: Promise<T>;
}

class RequestCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly TTL = 30000; // 30 seconds cache TTL

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > this.TTL;
  }

  async get<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const entry = this.cache.get(key);
    
    // If we have a valid cached entry, return it
    if (entry && !this.isExpired(entry) && entry.data !== undefined) {
      return entry.data;
    }
    
    // If there's already a pending request, return that promise
    if (entry && entry.promise) {
      try {
        return await entry.promise;
      } catch (error) {
        // If the promise failed, remove it from cache
        this.cache.delete(key);
        throw error;
      }
    }
    
    // Create new request
    const promise = fetcher();
    
    // Store the promise immediately to prevent duplicate requests
    // Use a temporary entry to prevent concurrent calls
    this.cache.set(key, {
      data: undefined,
      timestamp: Date.now(),
      promise
    });
    
    try {
      const data = await promise;
      
      // Update cache with actual data and remove promise
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        promise: undefined
      });
      
      return data;
    } catch (error) {
      // Remove failed request from cache
      this.cache.delete(key);
      throw error;
    }
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const requestCache = new RequestCache();