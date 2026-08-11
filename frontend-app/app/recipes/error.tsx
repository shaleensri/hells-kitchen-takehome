"use client";

import { useEffect } from "react";
import styles from "./error.module.css";

// Error boundaries must be client components (Next.js App Router requirement).
// Catches anything thrown by page.tsx — e.g. the backend being unreachable.
export default function RecipesError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("[/recipes] failed to load:", error);
  }, [error]);

  return (
    <div className={`container ${styles.wrapper}`}>
      <span className={styles.icon} aria-hidden="true">
        🔥
      </span>
      <h1>Something went wrong loading recipes</h1>
      <p>
        {error.message || "The recipe server didn't respond. It may be starting up or temporarily unavailable."}
      </p>
      <button type="button" onClick={() => reset()} className={styles.retryButton}>
        Try again
      </button>
    </div>
  );
}
