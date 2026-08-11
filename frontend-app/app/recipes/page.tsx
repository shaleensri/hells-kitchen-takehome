import type { Metadata } from "next";
import Link from "next/link";
import type { SortField, SortOrder } from "@hells-kitchen/shared";
import { fetchRecipes } from "@/lib/api";
import { firstValue, splitList } from "@/lib/searchParams";
import { FilterBar } from "./_components/FilterBar";
import { RecipeCard } from "./_components/RecipeCard";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Recipes — Hell's Kitchen",
};

interface RecipesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// Uncaught errors here (network down, backend 500, etc.) are caught by
// error.tsx automatically — App Router error boundary convention, no
// try/catch needed in the page itself.
export default async function RecipesPage({ searchParams }: RecipesPageProps) {
  const params = await searchParams;
  const q = firstValue(params.q);
  const tags = splitList(firstValue(params.tags));
  const ingredients = splitList(firstValue(params.ingredients));
  const sort = firstValue(params.sort) as SortField | undefined;
  const order = firstValue(params.order) as SortOrder | undefined;

  const recipes = await fetchRecipes({ q, tags, ingredients, sort, order });
  const hasFilters = Boolean(q || tags?.length || ingredients?.length);

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.heading}>Recipes</h1>
      <p className={styles.subheading}>Browse, search, and filter what&rsquo;s in the kitchen.</p>
      <FilterBar q={q} tags={tags} ingredients={ingredients} />

      {recipes.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyStateIcon} aria-hidden="true">
            🍽️
          </span>
          <p>{hasFilters ? "No recipes match your filters." : "No recipes found."}</p>
          {hasFilters && <Link href="/recipes">Clear filters and start over</Link>}
        </div>
      ) : (
        <>
          <p className={styles.resultCount}>
            {recipes.length} recipe{recipes.length === 1 ? "" : "s"}
          </p>
          <div className={styles.grid}>
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
