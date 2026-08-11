"use client";

/**
 * Favorite toggle (PLAN.md §4.3, Iteration 5). Two variants: `icon` for the
 * dense card grid, `button` for the detail page's action row — same
 * underlying `useFavorites` state so toggling in either place stays in sync
 * everywhere it's rendered (§4.3's same-tab reactivity note).
 */
import { useFavorites } from "@/lib/favorites";
import styles from "./FavoriteButton.module.css";

const HEART_PATH = "M12 17.3l-6.16 3.24 1.18-6.88L2 8.76l6.9-1L12 1.5l3.1 6.26 6.9 1-5.02 4.9 1.18 6.88z";

export function FavoriteButton({
  recipeId,
  variant = "icon",
  className,
}: {
  recipeId: string;
  variant?: "icon" | "button";
  className?: string;
}) {
  const { isFavorite, toggle, hydrated } = useFavorites();
  const active = isFavorite(recipeId);

  if (variant === "button") {
    return (
      <button
        type="button"
        className={`btn ${active ? "btn-primary" : "btn-secondary"}`}
        onClick={() => toggle(recipeId)}
        aria-pressed={active}
        disabled={!hydrated}
      >
        {active ? "Saved ✓" : "Save recipe"}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`${styles.iconBtn} ${active ? styles.active : ""} ${className ?? ""}`}
      onClick={() => toggle(recipeId)}
      aria-pressed={active}
      aria-label={active ? "Remove from saved recipes" : "Save recipe"}
      title={active ? "Remove from saved recipes" : "Save recipe"}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
        <path d={HEART_PATH} />
      </svg>
    </button>
  );
}
