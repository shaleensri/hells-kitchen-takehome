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
      <div className={`blueprint ${styles.panel}`}>
        <i className="corner tl" />
        <i className="corner tr" />
        <i className="corner bl" />
        <i className="corner br" />
        <div className="eyebrow">Error — sheet failed to load</div>
        <h1 className={styles.heading}>Something went wrong</h1>
        <p className={styles.message}>
          {error.message ||
            "The recipe server didn't respond. It may be starting up or temporarily unavailable."}
        </p>
        <button type="button" onClick={() => reset()} className="btn btn-primary">
          Try again
        </button>
      </div>
    </div>
  );
}
