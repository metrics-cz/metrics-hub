interface CacheEntry<T> {
  data: T;
  timestamp: number;
  promise?: Promise<T>;
}

class RequestCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly TTL = 30000; // 30 seconds cache TTL
  private readonly MAX_SIZE = 1000; // Maximum cache entries
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Automatic cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
    
    // Cleanup on process exit
    if (typeof process !== 'undefined') {
      process.on('exit', () => this.destroy());
      process.on('SIGINT', () => this.destroy());
      process.on('SIGTERM', () => this.destroy());
    }
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > this.TTL;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.TTL) {
        this.cache.delete(key);
      }
    }
    
    // If still too large, remove oldest entries
    if (this.cache.size > this.MAX_SIZE) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, this.cache.size - this.MAX_SIZE);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  private enforceSizeLimit(): void {
    if (this.cache.size >= this.MAX_SIZE) {
      // Remove oldest 20% of entries when limit is reached
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = Math.ceil(this.MAX_SIZE * 0.2);
      entries.slice(0, toRemove).forEach(([key]) => this.cache.delete(key));
    }
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
    
    // Enforce size limit before adding new entry
    this.enforceSizeLimit();
    
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

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }

  getStats(): { size: number; maxSize: number; ttl: number } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_SIZE,
      ttl: this.TTL
    };
  }
}

export const requestCache = new RequestCache();