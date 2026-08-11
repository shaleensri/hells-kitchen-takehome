"use client";

/**
 * Favorites list (PLAN.md §4.3, Iteration 5) — client-rendered because
 * "which recipes" only exists in localStorage (§3.1, no accounts). Fetches
 * the full recipe list (cheap — 15 recipes, no pagination, §3.10) and
 * filters to the saved ids client-side rather than adding a new backend
 * endpoint for what's really a client-only concern.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import type { RecipeListItem } from "@hells-kitchen/shared";
import { fetchRecipes } from "@/lib/api";
import { useFavorites } from "@/lib/favorites";
import { RecipeCard } from "@/app/recipes/_components/RecipeCard";
import styles from "./page.module.css";

export function SavedRecipes() {
  const { favoriteIds, hydrated } = useFavorites();
  const [allRecipes, setAllRecipes] = useState<RecipeListItem[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchRecipes()
      .then(setAllRecipes)
      .catch(() => setError(true));
  }, []);

  const saved = allRecipes?.filter((r) => favoriteIds.includes(r.id)) ?? null;
  const loading = !hydrated || allRecipes === null;

  return (
    <div className={`container ${styles.page}`}>
      <div className="eyebrow">Saved</div>
      <h1 className={styles.heading}>Saved Recipes</h1>
      <p className={styles.description}>Recipes you&rsquo;ve favorited on this device.</p>

      <div className="rule" style={{ margin: "var(--space-5) 0" }} />

      {error ? (
        <div className={styles.emptyState}>
          <p>Couldn&rsquo;t reach the recipe server. Try refreshing.</p>
        </div>
      ) : loading ? (
        <p className={styles.note}>Loading…</p>
      ) : saved && saved.length > 0 ? (
        <div className={styles.grid}>
          {saved.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p>Nothing saved yet — click the star on any recipe to add it here.</p>
          <Link href="/recipes">Browse the recipe index</Link>
        </div>
      )}
    </div>
  );
}
