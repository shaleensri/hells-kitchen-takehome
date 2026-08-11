import Link from "next/link";
import { fetchRecipes } from "@/lib/api";
import styles from "./not-found.module.css";

const SUGGESTION_COUNT = 3;

export default async function RecipeNotFound() {
  // Real suggestions, not decorative ones — a not-found page is a server
  // component like any other, so it can fetch its own "try instead" list.
  let suggestions: Awaited<ReturnType<typeof fetchRecipes>> = [];
  try {
    suggestions = (await fetchRecipes()).slice(0, SUGGESTION_COUNT);
  } catch {
    // If the backend is also down, just skip the suggestions section —
    // the core "not found" message still renders fine without it.
  }

  return (
    <div className={`container ${styles.wrapper}`}>
      <div className={`blueprint ${styles.panel}`}>
        <i className="corner tl" />
        <i className="corner tr" />
        <i className="corner bl" />
        <i className="corner br" />
        <div className="eyebrow">Error 404 — sheet not on file</div>
        <h1 className={styles.heading}>No such recipe</h1>
        <p className={styles.message}>
          This entry isn&rsquo;t in the index. It may have been removed, or the reference number is wrong.
        </p>
        <div className={styles.actions}>
          <Link href="/recipes" className="btn btn-primary">
            Back to index
          </Link>
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className={styles.suggestions}>
          <h6 className="label">Try instead</h6>
          <div className={styles.suggestionList}>
            {suggestions.map((recipe) => (
              <Link key={recipe.id} href={`/recipes/${recipe.id}`} className={styles.suggestionRow}>
                <span className={styles.no}>
                  {/^\d+$/.test(recipe.id) ? recipe.id.padStart(2, "0") : recipe.id}
                </span>
                {recipe.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
