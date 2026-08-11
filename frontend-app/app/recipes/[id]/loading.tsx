import styles from "./loading.module.css";

export default function RecipeDetailLoading() {
  return (
    <div className={`container ${styles.page}`}>
      <div className={`${styles.sk} ${styles.backSk}`} />
      <div className={`${styles.sk} ${styles.eyebrowSk}`} />
      <div className={`${styles.sk} ${styles.titleSk}`} />
      <div className={`${styles.sk} ${styles.descSk}`} />
      <div className={styles.statsStripSk}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${styles.sk} ${styles.statSk}`} />
        ))}
      </div>
      <div className={styles.columns}>
        <div className={`blueprint ${styles.block}`}>
          <i className="corner tl" />
          <i className="corner tr" />
          <i className="corner bl" />
          <i className="corner br" />
        </div>
        <div className={`blueprint ${styles.block}`}>
          <i className="corner tl" />
          <i className="corner tr" />
          <i className="corner bl" />
          <i className="corner br" />
        </div>
      </div>
    </div>
  );
}
