import styles from "./loading.module.css";

export default function RecipeDetailLoading() {
  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.backSkeleton} />
      <div className={styles.titleSkeleton} />
      <div className={styles.metaSkeleton} />
      <div className={styles.columns}>
        <div className={styles.blockSkeleton} />
        <div className={styles.blockSkeleton} />
      </div>
    </div>
  );
}
