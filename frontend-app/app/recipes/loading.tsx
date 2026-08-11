import styles from "./loading.module.css";

// Next.js wraps page.tsx's async work in a Suspense boundary automatically
// when a loading.tsx exists in the same route segment — this renders while
// the two fetchRecipes() calls are in flight.
export default function RecipesLoading() {
  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.headerRow}>
        <div className={`${styles.sk} ${styles.heading}`} />
        <div className={styles.eyebrowSk} />
      </div>
      <div className={`${styles.sk} ${styles.searchSk}`} />
      <div className="rule" style={{ margin: "0 0 var(--space-5)" }} />
      <div className={styles.layout}>
        <div className={styles.rail}>
          <div className={`${styles.sk} ${styles.railBlock}`} />
          <div className={`${styles.sk} ${styles.railBlock}`} />
        </div>
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`blueprint ${styles.cardSkeleton}`}>
              <i className="corner tl" />
              <i className="corner tr" />
              <i className="corner bl" />
              <i className="corner br" />
              <div className={`${styles.sk} ${styles.cardTitle}`} />
              <div className={`${styles.sk} ${styles.cardLine}`} />
              <div className={`${styles.sk} ${styles.cardLineShort}`} />
              <div className="rule" style={{ margin: "10px 0" }} />
              <div className={styles.cardStats}>
                <div className={`${styles.sk} ${styles.statSk}`} />
                <div className={`${styles.sk} ${styles.statSk}`} />
                <div className={`${styles.sk} ${styles.statSk}`} />
                <div className={`${styles.sk} ${styles.statSk}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
