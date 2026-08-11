import Link from "next/link";
import styles from "./not-found.module.css";

export default function RecipeNotFound() {
  return (
    <div className={`container ${styles.wrapper}`}>
      <span className={styles.icon} aria-hidden="true">
        🍳
      </span>
      <h1>Recipe not found</h1>
      <p>We couldn&rsquo;t find a recipe with that ID. It may have been removed, or the link might be wrong.</p>
      <Link href="/recipes" className={styles.link}>
        ← Back to all recipes
      </Link>
    </div>
  );
}
