"use client";

import { useEffect } from "react";
import Link from "next/link";
import styles from "./error.module.css";

export default function RecipeDetailError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("[/recipes/:id] failed to load:", error);
  }, [error]);

  return (
    <div className={`container ${styles.wrapper}`}>
      <h1>Something went wrong loading this recipe</h1>
      <p>{error.message || "The recipe server didn't respond. It may be starting up or temporarily unavailable."}</p>
      <div className={styles.actions}>
        <button type="button" onClick={() => reset()} className={styles.retryButton}>
          Try again
        </button>
        <Link href="/recipes">Back to recipes</Link>
      </div>
    </div>
  );
}
