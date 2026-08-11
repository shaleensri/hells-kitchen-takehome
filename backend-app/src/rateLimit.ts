/**
 * In-memory per-key rate limiter (PLAN.md §3.11) — a simple fixed-window
 * counter is enough for a take-home; no distributed limiter (Redis etc.)
 * needed. Deliberately generic on `key` rather than baking in "IP address"
 * so tests can use arbitrary keys without needing a real request object.
 *
 * Trade-off, documented rather than hidden: this state is per-process and
 * resets on restart/redeploy, and doesn't share state across multiple
 * backend instances. Acceptable for this project's single-instance deploy
 * (§3.6) — revisit only if the deploy target ever scales horizontally.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

/** Records one request for `key` and returns whether it should be rejected. */
export function isRateLimited(key: string, now: number = Date.now()): boolean {
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return false;
  }
  bucket.count += 1;
  return bucket.count > MAX_REQUESTS_PER_WINDOW;
}

/** Test-only: clears all tracked buckets so tests don't leak state into each other. */
export function resetRateLimiter(): void {
  buckets.clear();
}

export const RATE_LIMIT_WINDOW_MS = WINDOW_MS;
export const RATE_LIMIT_MAX_REQUESTS = MAX_REQUESTS_PER_WINDOW;
