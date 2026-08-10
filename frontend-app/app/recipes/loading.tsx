import styles from "./loading.module.css";

// Next.js wraps page.tsx's async work in a Suspense boundary automatically
// when a loading.tsx exists in the same route segment — this renders while
// fetchRecipes() is in flight.
export default function RecipesLoading() {
  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.headingSkeleton} />
      <div className={styles.filterSkeleton} />
      <div className={styles.grid}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={styles.cardSkeleton} />
        ))}
      </div>
    </div>
  );
}
