const store = new Map<string, { expires: number; data: unknown }>()

const DEFAULT_TTL_MS = 45_000

export function getCached<T>(key: string): T | undefined {
  const entry = store.get(key)
  if (!entry) return undefined
  if (Date.now() > entry.expires) {
    store.delete(key)
    return undefined
  }
  return entry.data as T
}

export function setCached(key: string, data: unknown, ttlMs = DEFAULT_TTL_MS) {
  store.set(key, { expires: Date.now() + ttlMs, data })
}

export function invalidateCache(prefix?: string) {
  if (!prefix) {
    store.clear()
    return
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}
