"use client";

/**
 * Header nav (Iteration 5) — Saved/Shopping List/Preferences now exist, so
 * they're no longer deliberately omitted (contrast with the design-pass
 * decision log, PLAN.md §3.20, which left them out because the features
 * didn't exist yet). Client component only for the item counts: the initial
 * render matches the server (no count shown) and counts fill in after mount
 * via useFavorites/useShoppingListEntries — same "stable SSR default, fill
 * in after hydration" pattern already used by those hooks, so there's no
 * hydration mismatch, just a harmless one-time appearance of the number.
 */
import Link from "next/link";
import { useFavorites } from "@/lib/favorites";
import { useShoppingListEntries } from "@/lib/shoppingList";
import styles from "../layout.module.css";

export function NavLinks() {
  const { favoriteIds, hydrated: favoritesHydrated } = useFavorites();
  const { entries, hydrated: listHydrated } = useShoppingListEntries();

  return (
    <nav className={styles.nav}>
      <Link href="/recipes">Recipes</Link>
      <Link href="/saved">Saved{favoritesHydrated && favoriteIds.length > 0 ? ` (${favoriteIds.length})` : ""}</Link>
      <Link href="/shopping-list">
        Shopping List{listHydrated && entries.length > 0 ? ` (${entries.length})` : ""}
      </Link>
      <Link href="/preferences">Preferences</Link>
    </nav>
  );
}
