/**
 * Thin, SSR-safe localStorage wrapper. Iteration 5 (PLAN.md §3.1/§4.3): the
 * profile, favorites, and shopping-list features are all localStorage-only
 * (no accounts, §3.1), and every one of them needs the same "don't blow up
 * during server rendering, don't blow up in private-browsing storage quota"
 * guard rails — centralized here instead of repeated three times.
 */

export function readLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    // Malformed JSON (e.g. hand-edited devtools value) or storage access
    // blocked (private browsing, disabled storage) — degrade to fallback
    // rather than throw and take down the page.
    return fallback;
  }
}

export function writeLocalStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage blocked — silently no-op. Nothing in this
    // app is destructive if a save doesn't persist (favorites/profile/list
    // just won't stick around), so there's no user-facing error to surface.
  }
}
