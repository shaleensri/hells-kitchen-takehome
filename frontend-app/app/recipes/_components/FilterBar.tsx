import Link from "next/link";
import styles from "./FilterBar.module.css";

interface FilterBarProps {
  q?: string;
  tags?: string[];
  ingredients?: string[];
}

/**
 * Plain native <form method="GET">, no client JS required — submitting
 * navigates to /recipes?q=...&tags=...&ingredients=..., which the server
 * component re-fetches against. Progressive-enhancement-friendly, and the
 * idiomatic Next.js App Router pattern for URL-driven filtering (also makes
 * filtered views bookmarkable/shareable for free).
 */
export function FilterBar({ q, tags, ingredients }: FilterBarProps) {
  const hasFilters = Boolean(q || tags?.length || ingredients?.length);

  return (
    <form action="/recipes" method="GET" className={styles.form}>
      <div className={styles.field}>
        <label htmlFor="q">Search</label>
        <input id="q" name="q" type="search" placeholder="Recipe name or description…" defaultValue={q ?? ""} />
      </div>
      <div className={styles.field}>
        <label htmlFor="tags">Tags</label>
        <input
          id="tags"
          name="tags"
          type="text"
          placeholder="e.g. italian, dinner"
          defaultValue={tags?.join(", ") ?? ""}
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="ingredients">Ingredients</label>
        <input
          id="ingredients"
          name="ingredients"
          type="text"
          placeholder="e.g. garlic, chicken"
          defaultValue={ingredients?.join(", ") ?? ""}
        />
      </div>
      <div className={styles.actions}>
        <button type="submit" className={styles.submitButton}>
          Search
        </button>
        {hasFilters && (
          <Link href="/recipes" className={styles.clearLink}>
            Clear filters
          </Link>
        )}
      </div>
    </form>
  );
}
