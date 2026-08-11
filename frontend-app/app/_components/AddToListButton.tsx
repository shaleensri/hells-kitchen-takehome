"use client";

/**
 * Shopping-list toggle (PLAN.md §4.3, Iteration 5) — adds/removes a recipe
 * from the localStorage shopping-list at its base servings (see
 * lib/shoppingList.ts's file header for why "base servings" specifically:
 * nothing in the app currently offers adding at a scaled count).
 */
import { useShoppingListEntries } from "@/lib/shoppingList";
import styles from "./AddToListButton.module.css";

const CART_PATH_BODY = "M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h7.2a2 2 0 0 0 2-1.6L21 8H6";
const CART_WHEEL_LEFT = { cx: 9, cy: 20, r: 1 };
const CART_WHEEL_RIGHT = { cx: 17, cy: 20, r: 1 };

export function AddToListButton({
  recipeId,
  servings,
  variant = "icon",
  className,
}: {
  recipeId: string;
  servings: number;
  variant?: "icon" | "button";
  className?: string;
}) {
  const { isListed, toggle, hydrated } = useShoppingListEntries();
  const active = isListed(recipeId);

  if (variant === "button") {
    return (
      <button
        type="button"
        className={`btn ${active ? "btn-primary" : "btn-secondary"}`}
        onClick={() => toggle(recipeId, servings)}
        aria-pressed={active}
        disabled={!hydrated}
      >
        {active ? "On shopping list ✓" : "Add to shopping list"}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`${styles.iconBtn} ${active ? styles.active : ""} ${className ?? ""}`}
      onClick={() => toggle(recipeId, servings)}
      aria-pressed={active}
      aria-label={active ? "Remove from shopping list" : "Add to shopping list"}
      title={active ? "Remove from shopping list" : "Add to shopping list"}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d={CART_PATH_BODY} />
        <circle cx={CART_WHEEL_LEFT.cx} cy={CART_WHEEL_LEFT.cy} r={CART_WHEEL_LEFT.r} fill="currentColor" stroke="none" />
        <circle cx={CART_WHEEL_RIGHT.cx} cy={CART_WHEEL_RIGHT.cy} r={CART_WHEEL_RIGHT.r} fill="currentColor" stroke="none" />
      </svg>
      {/* Active state is conveyed by color alone (via .active), matching
          FavoriteButton's pattern — no separate glyph to keep in sync. */}
    </button>
  );
}
