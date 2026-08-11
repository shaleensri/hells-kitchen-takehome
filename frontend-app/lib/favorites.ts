"use client";

/**
 * localStorage-based favoriting (PLAN.md §4.3, Iteration 5) — no accounts
 * (§3.1), so "saving" a recipe just means recording its id in localStorage.
 *
 * Same-tab reactivity: the native `storage` event only fires in *other*
 * tabs, not the one that made the change, so a card's favorite star and the
 * header's saved-count badge wouldn't see each other's toggles without an
 * extra signal. Fixed with a custom `window` event dispatched on every
 * write; `useFavorites` listens for both that and the native `storage`
 * event (for genuine cross-tab sync).
 */
import { useCallback, useEffect, useState } from "react";
import { readLocalStorage, writeLocalStorage } from "./storage";

const FAVORITES_KEY = "hk:favorites";
const FAVORITES_EVENT = "hk:favorites-changed";

/** Pure, storage-free — easy to unit test independent of localStorage/DOM. */
export function toggleId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function getFavoriteIds(): string[] {
  return readLocalStorage<string[]>(FAVORITES_KEY, []);
}

export function toggleFavorite(id: string): string[] {
  const next = toggleId(getFavoriteIds(), id);
  writeLocalStorage(FAVORITES_KEY, next);
  window.dispatchEvent(new Event(FAVORITES_EVENT));
  return next;
}

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Deferred to an effect, not read at module/render time: localStorage
    // doesn't exist during SSR, and reading it during the first client
    // render (before hydration) would mismatch whatever the server sent.
    setFavoriteIds(getFavoriteIds());
    setHydrated(true);
    const onChange = () => setFavoriteIds(getFavoriteIds());
    window.addEventListener(FAVORITES_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(FAVORITES_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const toggle = useCallback((id: string) => setFavoriteIds(toggleFavorite(id)), []);
  const isFavorite = useCallback((id: string) => favoriteIds.includes(id), [favoriteIds]);

  return { favoriteIds, hydrated, toggle, isFavorite };
}
