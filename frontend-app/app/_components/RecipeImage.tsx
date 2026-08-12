"use client";

import { useState } from "react";
import Image from "next/image";
import { recipeImageSrc } from "@/lib/recipeImages";
import styles from "./RecipeImage.module.css";

interface RecipeImageProps {
  recipeId: string;
  title: string;
  sizes: string;
  priority?: boolean;
}

/**
 * One real photo per recipe — PLAN.md §3.35. Sourced from Wikimedia Commons
 * (openly-licensed, real dish photography — not generated, not hotlinked),
 * downloaded once and checked into
 * frontend-app/public/images/recipes/{recipeId}.jpg, exactly like the
 * dataset itself (PLAN.md §3.31) has no runtime dependency on where it came
 * from. The path is a plain convention keyed on the recipe id — no
 * data.json/backend change, since the id is already the one piece of
 * stable identity every recipe has.
 *
 * Defensive fallback: nothing currently enforces that every recipe has an
 * image file (today's 32 all do, but a recipe added later might not), so a
 * failed load renders a quiet labeled placeholder instead of a broken-image
 * icon — the same "degrade visibly, don't silently break" posture this app
 * already uses for partial nutrition and unresolved ingredients.
 */
export function RecipeImage({ recipeId, title, sizes, priority }: RecipeImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={styles.fallback} role="img" aria-label={`${title} — no photo available`}>
        <span>No photo</span>
      </div>
    );
  }

  return (
    <Image
      src={recipeImageSrc(recipeId)}
      alt={title}
      fill
      sizes={sizes}
      className={styles.image}
      onError={() => setFailed(true)}
      priority={priority}
    />
  );
}
