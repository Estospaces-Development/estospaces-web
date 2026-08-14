interface AsyncRequestCacheEntry<T> {
  expiresAt: number;
  pending: boolean;
  request: Promise<T>;
}

export interface AsyncRequestCache<T> {
  get: (key: string, loader: () => Promise<T>) => Promise<T>;
  delete: (key: string) => void;
  clear: () => void;
}

export const createAsyncRequestCache = <T>(
  ttlMs: number,
  shouldCache: (value: T) => boolean = () => true,
): AsyncRequestCache<T> => {
  const entries = new Map<string, AsyncRequestCacheEntry<T>>();

  const pruneExpired = (now: number) => {
    entries.forEach((entry, key) => {
      if (!entry.pending && entry.expiresAt <= now) {
        entries.delete(key);
      }
    });
  };

  const get = (key: string, loader: () => Promise<T>): Promise<T> => {
    const now = Date.now();
    pruneExpired(now);
    const existing = entries.get(key);
    if (existing && (existing.pending || existing.expiresAt > now)) {
      return existing.request;
    }

    const request = Promise.resolve().then(loader);
    entries.set(key, {
      expiresAt: 0,
      pending: true,
      request,
    });

    void request.then(
      (value) => {
        const current = entries.get(key);
        if (current?.request !== request) {
          return;
        }
        if (!shouldCache(value)) {
          entries.delete(key);
          return;
        }
        current.pending = false;
        current.expiresAt = Date.now() + ttlMs;
      },
      () => {
        if (entries.get(key)?.request === request) {
          entries.delete(key);
        }
      },
    );

    return request;
  };

  return {
    get,
    delete: (key) => entries.delete(key),
    clear: () => entries.clear(),
  };
};
