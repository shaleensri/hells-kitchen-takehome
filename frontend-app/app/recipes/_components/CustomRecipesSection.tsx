"use client";

import { useCustomRecipes } from "@/lib/customRecipes";
import { CustomRecipeCard } from "./CustomRecipeCard";
import styles from "./CustomRecipesSection.module.css";

export function CustomRecipesSection() {
  const { customRecipes, hydrated } = useCustomRecipes();

  if (!hydrated || customRecipes.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby="custom-recipes-heading">
      <div className={styles.header}>
        <div>
          <div className="eyebrow">Local drafts</div>
          <h2 id="custom-recipes-heading" className={styles.heading}>
            Your custom recipes
          </h2>
        </div>
        <p className={styles.note}>Saved locally in this browser.</p>
      </div>
      <div className={styles.grid}>
        {customRecipes.map((recipe) => (
          <CustomRecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>
    </section>
  );
}
