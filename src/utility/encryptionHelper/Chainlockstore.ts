/**
 * ChainLock™ TTL Session Store
 * ─────────────────────────────
 * Zero-dependency in-memory store with:
 *   - O(1) get/set/delete via Map
 *   - Lazy expiry (checked on access)
 *   - Periodic sweep (every 5 min) to free memory
 *   - Capacity cap (default 50 000 sessions) → evicts oldest on overflow
 *   - No Redis needed; handles millions of short-lived sessions
 *
 * In production: swap storeMap with an LRU library or Redis client
 * by only changing this file — services are unchanged.
 */

export interface SessionEntry {
  privateKey: string;          // RSA-4096 private key (PEM)
  encryptedAesKey: string;     // RSA-OAEP(AES master key) → hex
  expiresAt: number;           // Unix ms
  createdAt: number;           // for LRU eviction
}

const MAX_SESSIONS = 50_000;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;   // sweep every 5 min
const TTL_MS = 15 * 60 * 1000;             // default session lifetime

const store = new Map<string, SessionEntry>();

// ─── Periodic sweep — removes expired entries without a per-entry timeout ─────
const sweep = () => {
  const now = Date.now();
  for (const [id, entry] of store) {
    if (now > entry.expiresAt) store.delete(id);
  }
};

setInterval(sweep, SWEEP_INTERVAL_MS).unref(); // .unref() won't block process exit

// ─── LRU-style eviction when over capacity ─────────────────────────────────────
const evictOldest = () => {
  let oldest: [string, SessionEntry] | null = null;
  for (const pair of store) {
    if (!oldest || pair[1].createdAt < oldest[1].createdAt) oldest = pair;
  }
  if (oldest) store.delete(oldest[0]);
};

// ─── Public API ───────────────────────────────────────────────────────────────

export const sessionStore = {
  set(id: string, entry: Omit<SessionEntry, "createdAt" | "expiresAt">): SessionEntry {
    if (store.size >= MAX_SESSIONS) evictOldest();

    const full: SessionEntry = {
      ...entry,
      createdAt: Date.now(),
      expiresAt: Date.now() + TTL_MS,
    };
    store.set(id, full);
    return full;
  },

  get(id: string): SessionEntry | null {
    const entry = store.get(id);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      store.delete(id);
      return null;                // expired
    }
    return entry;
  },

  delete(id: string): void {
    store.delete(id);
  },

  /** Diagnostics — useful for /health endpoint */
  stats() {
    return { sessions: store.size, maxSessions: MAX_SESSIONS };
  },
};