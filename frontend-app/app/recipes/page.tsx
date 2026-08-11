import type { Metadata } from "next";
import Link from "next/link";
import type { Difficulty, SortField, SortOrder } from "@hells-kitchen/shared";
import { fetchRecipes } from "@/lib/api";
import { firstValue, splitList } from "@/lib/searchParams";
import { FilterRail } from "./_components/FilterRail";
import { SortControl } from "./_components/SortControl";
import { RecipeCard } from "./_components/RecipeCard";
import { ProfileAutoApply } from "./_components/ProfileAutoApply";
import { SmartRecipeFinder } from "./SmartRecipeFinder";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Recipe Index — Hell's Kitchen",
};

interface RecipesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function medianPrepMinutes(recipes: { prepTime: string }[]): number | null {
  const values = recipes
    .map((r) => Number(r.prepTime.match(/\d+/)?.[0]))
    .filter((n): n is number => Number.isFinite(n))
    .sort((a, b) => a - b);
  if (values.length === 0) return null;
  const mid = Math.floor(values.length / 2);
  return values.length % 2 === 0 ? Math.round((values[mid - 1] + values[mid]) / 2) : values[mid];
}

// Uncaught errors here (network down, backend 500, etc.) are caught by
// error.tsx automatically — App Router error boundary convention, no
// try/catch needed in the page itself.
export default async function RecipesPage({ searchParams }: RecipesPageProps) {
  const params = await searchParams;
  const q = firstValue(params.q);
  const tags = splitList(firstValue(params.tags));
  const ingredients = splitList(firstValue(params.ingredients));
  const dietary = splitList(firstValue(params.dietary));
  const difficulty = firstValue(params.difficulty) as Difficulty | undefined;
  const sort = firstValue(params.sort) as SortField | undefined;
  const order = firstValue(params.order) as SortOrder | undefined;

  const hasFilters = Boolean(
    q || tags?.length || ingredients?.length || dietary?.length || difficulty
  );

  // Two fetches: the unfiltered list powers the header stats and the filter
  // rail's per-option counts; the filtered list is what's actually shown.
  // Both cheap — 32-recipe dataset, no pagination (§3.10).
  const [allRecipes, filteredRecipes] = await Promise.all([
    fetchRecipes(),
    fetchRecipes({ q, tags, ingredients, dietary, difficulty, sort, order }),
  ]);

  const medianPrep = medianPrepMinutes(allRecipes);

  return (
    <div className={`container ${styles.page}`}>
      <ProfileAutoApply />
      <div className={styles.titleRow}>
        <div>
          <div className="eyebrow">Sheet 01 — All entries</div>
          <h1 className={styles.heading}>Recipe Index</h1>
        </div>
        <div className={styles.stats}>
          <div>
            <div className="label">Entries</div>
            <div className={styles.statValue}>{allRecipes.length}</div>
          </div>
          {medianPrep !== null && (
            <div>
              <div className="label">Median prep</div>
              <div className={styles.statValue}>{medianPrep} min</div>
            </div>
          )}
        </div>
      </div>

      <SmartRecipeFinder />

      <form action="/recipes" method="GET" className={styles.searchForm}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search recipes…"
          className={styles.searchInput}
        />
        {/* One hidden input per filter, comma-joined — must match the
            parser convention (firstValue/splitList) and every other filter
            control, not one input per value (that's repeated-key form
            semantics, which nothing here parses). See PLAN.md §3.22. */}
        {tags && tags.length > 0 && <input type="hidden" name="tags" value={tags.join(",")} />}
        {ingredients && ingredients.length > 0 && (
          <input type="hidden" name="ingredients" value={ingredients.join(",")} />
        )}
        {dietary && dietary.length > 0 && <input type="hidden" name="dietary" value={dietary.join(",")} />}
        {difficulty && <input type="hidden" name="difficulty" value={difficulty} />}
        {sort && <input type="hidden" name="sort" value={sort} />}
        {order && <input type="hidden" name="order" value={order} />}
      </form>

      <div className="rule" style={{ margin: "0 0 var(--space-5)" }} />

      <div className={styles.layout}>
        <FilterRail raw={params} allRecipes={allRecipes} ingredients={ingredients ?? []} difficulty={difficulty} />

        <div>
          <div className={styles.toolbar}>
            <span className={styles.resultCount}>
              {filteredRecipes.length} of {allRecipes.length} entries shown
            </span>
            <SortControl sort={sort} order={order} />
          </div>

          {filteredRecipes.length === 0 ? (
            <div className={styles.emptyState}>
              <p>{hasFilters ? "No recipes match your filters." : "No recipes found."}</p>
              {hasFilters && <Link href="/recipes">Clear filters and start over</Link>}
            </div>
          ) : (
            <div className={styles.grid}>
              {filteredRecipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
