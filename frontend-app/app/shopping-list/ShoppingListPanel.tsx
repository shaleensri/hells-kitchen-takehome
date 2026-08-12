"use client";

/**
 * Shopping-list page (PLAN.md §4.3, §3.9, §5.3, Iteration 5). Client-rendered
 * because the list of selected recipes only exists in localStorage. Fetches
 * each selected recipe's full detail (needed for real ingredient lines, not
 * just the lightweight list-item shape) and merges them client-side via
 * lib/shoppingList.ts — no new backend endpoint, per §5.3's leaning.
 *
 * Uses Promise.allSettled rather than Promise.all when fetching the selected
 * recipes: one stale/deleted recipe id shouldn't blank the entire list, it
 * should just show as "couldn't load" for that one row while the rest of
 * the list still renders and merges normally.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { RecipeDetail } from "@hells-kitchen/shared";
import { fetchRecipe } from "@/lib/api";
import { buildShoppingList, formatGrams, useCheckedOff, useShoppingListEntries } from "@/lib/shoppingList";
import styles from "./page.module.css";

export function ShoppingListPanel() {
  const { entries, hydrated, remove, clear } = useShoppingListEntries();
  const { toggle: toggleChecked, isChecked } = useCheckedOff();
  const [recipes, setRecipes] = useState<Record<string, RecipeDetail>>({});
  const [loading, setLoading] = useState(false);

  const recipeIdsKey = [...entries.map((e) => e.recipeId)].sort().join(",");

  useEffect(() => {
    if (!hydrated || entries.length === 0) {
      setRecipes({});
      // Also reset loading — without this, clearing/removing the last entry
      // while a previous fetch is still in flight leaves `loading` stuck at
      // true forever: the in-flight fetch's own .then() sees `cancelled` and
      // bails before it would otherwise call setLoading(false) (Codex catch).
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.allSettled(entries.map((e) => fetchRecipe(e.recipeId))).then((results) => {
      if (cancelled) return;
      const map: Record<string, RecipeDetail> = {};
      for (const result of results) {
        if (result.status === "fulfilled") map[result.value.id] = result.value;
      }
      setRecipes(map);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // Re-fetches only when the *set* of recipe ids changes, not on every
    // servings edit — recipeIdsKey is the stable dependency, entries itself
    // changes identity on every store read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, recipeIdsKey]);

  const list = useMemo(() => {
    const ready = entries.filter((e) => recipes[e.recipeId]).map((e) => ({ recipe: recipes[e.recipeId], servings: e.servings }));
    return buildShoppingList(ready);
  }, [entries, recipes]);

  const showLoading = !hydrated || loading;
  const showEmpty = !showLoading && entries.length === 0;

  return (
    <div className={`container ${styles.page}`}>
      <div className="eyebrow">Shopping List</div>
      <h1 className={styles.heading}>Shopping List</h1>
      <p className={styles.description}>
        Ingredients merged across every recipe you&rsquo;ve added, matched by ingredient — not by name.
      </p>

      <div className="rule" style={{ margin: "var(--space-5) 0" }} />

      {showLoading ? (
        <p className={styles.note}>Loading…</p>
      ) : showEmpty ? (
        <div className={styles.emptyState}>
          <p>Nothing on your list yet — add a recipe from its card or detail page.</p>
          <Link href="/recipes">Browse the recipe index</Link>
        </div>
      ) : (
        <>
          <section>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionHeading}>Recipes on this list ({entries.length})</h2>
              <button type="button" className="btn btn-secondary" onClick={clear}>
                Clear list
              </button>
            </div>
            <ul className={styles.recipeList}>
              {entries.map((e) => {
                const recipe = recipes[e.recipeId];
                return (
                  <li key={e.recipeId} className={styles.recipeRow}>
                    {recipe ? (
                      <Link href={`/recipes/${e.recipeId}`} className={styles.recipeLink}>
                        {recipe.title}
                      </Link>
                    ) : (
                      <span className={styles.staleEntry}>
                        {e.recipeId} — couldn&rsquo;t load, it may have been removed
                      </span>
                    )}
                    <span className={styles.recipeServings}>
                      {e.servings} {e.servings === 1 ? "serving" : "servings"}
                    </span>
                    <button type="button" className={styles.removeBtn} onClick={() => remove(e.recipeId)}>
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="rule" style={{ margin: "var(--space-6) 0" }} />

          {list.merged.length > 0 && (
            <section>
              <h2 className={styles.sectionHeading}>Ingredients ({list.merged.length})</h2>
              <ul className={styles.ingredientList}>
                {list.merged.map((mline) => {
                  const key = `merged:${mline.ingredientId}`;
                  const checked = isChecked(key);
                  return (
                    <li key={mline.ingredientId} className={styles.ingredientRow}>
                      <label className={styles.checkLabel}>
                        <input type="checkbox" checked={checked} onChange={() => toggleChecked(key)} />
                        <span className={`${styles.amount} ${checked ? styles.checkedText : ""}`}>
                          {formatGrams(mline.grams)}
                        </span>
                        <span className={`${styles.ingredientName} ${checked ? styles.checkedText : ""}`}>
                          {mline.name}
                        </span>
                      </label>
                      {mline.sources.length > 1 && (
                        <span className={styles.sources}>from {mline.sources.length} recipes</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {list.unmerged.length > 0 && (
            <section className={styles.unmergedSection}>
              <h2 className={styles.sectionHeading}>Couldn&rsquo;t auto-merge ({list.unmerged.length})</h2>
              <p className={styles.unmergedNote}>
                No unit-conversion reference data for these — listed as-is rather than dropped.
              </p>
              <ul className={styles.ingredientList}>
                {list.unmerged.map((uline) => {
                  const checked = isChecked(uline.key);
                  return (
                    <li key={uline.key} className={styles.ingredientRow}>
                      <label className={styles.checkLabel}>
                        <input type="checkbox" checked={checked} onChange={() => toggleChecked(uline.key)} />
                        <span className={`${styles.amount} ${checked ? styles.checkedText : ""}`}>
                          {uline.amount} {uline.unit}
                        </span>
                        <span className={`${styles.ingredientName} ${checked ? styles.checkedText : ""}`}>
                          {uline.name}
                        </span>
                      </label>
                      <span className={styles.sources}>from {uline.recipeTitle}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
