type CacheEntry = {
  value: unknown;
  expiresAt: number;
};

type ServerCacheState = {
  values: Map<string, CacheEntry>;
  inFlight: Map<string, Promise<unknown>>;
};

const globalCache = globalThis as typeof globalThis & {
  __farmMachineSpecsServerCache?: ServerCacheState;
};

const state = globalCache.__farmMachineSpecsServerCache ?? {
  values: new Map<string, CacheEntry>(),
  inFlight: new Map<string, Promise<unknown>>(),
};

globalCache.__farmMachineSpecsServerCache = state;

export async function withServerTtlCache<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
  shouldCache: (value: T) => boolean = () => true,
): Promise<T> {
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) return loader();

  const now = Date.now();
  const cached = state.values.get(key);
  if (cached) {
    if (cached.expiresAt > now) return cached.value as T;
    state.values.delete(key);
  }

  const existing = state.inFlight.get(key);
  if (existing) return existing as Promise<T>;

  const pending = loader()
    .then((value) => {
      if (shouldCache(value)) {
        state.values.set(key, {
          value,
          expiresAt: Date.now() + ttlMs,
        });
      }
      return value;
    })
    .finally(() => {
      state.inFlight.delete(key);
    });

  state.inFlight.set(key, pending as Promise<unknown>);
  return pending;
}
