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
      <div className={`blueprint ${styles.panel}`}>
        <i className="corner tl" />
        <i className="corner tr" />
        <i className="corner bl" />
        <i className="corner br" />
        <div className="eyebrow">Error — sheet failed to load</div>
        <h1 className={styles.heading}>Something went wrong</h1>
        <p className={styles.message}>
          {error.message || "The recipe server didn't respond. It may be starting up or temporarily unavailable."}
        </p>
        <div className={styles.actions}>
          <button type="button" onClick={() => reset()} className="btn btn-primary">
            Try again
          </button>
          <Link href="/recipes" className={styles.link}>
            Back to index
          </Link>
        </div>
      </div>
    </div>
  );
}
