"use client";

import Link from "next/link";
import type { CustomRecipe } from "@/lib/customRecipes";
import { RecipeImage } from "@/app/_components/RecipeImage";
import styles from "./CustomRecipeCard.module.css";

export function CustomRecipeCard({ recipe }: { recipe: CustomRecipe }) {
  const href = `/custom-recipes/${encodeURIComponent(recipe.id)}`;
  return (
    <article className={`blueprint ${styles.card}`}>
      <i className="corner tl" />
      <i className="corner tr" />
      <i className="corner bl" />
      <i className="corner br" />
      <Link href={href} className={styles.cardLink} aria-label={recipe.title} />

      <div className={styles.thumb}>
        <RecipeImage
          recipeId={recipe.sourceRecipeId}
          title={recipe.title}
          sizes="(max-width: 560px) 100vw, (max-width: 900px) 50vw, 320px"
        />
      </div>

      <div className={styles.cardHeader}>
        <span className={styles.badge}>Custom</span>
        <h3 className={styles.title}>{recipe.title}</h3>
      </div>

      <p className={styles.description}>{recipe.description}</p>
      <div className="rule" />

      <dl className={styles.meta}>
        <div>
          <dt>Prep</dt>
          <dd>{recipe.prepTime.match(/\d+/)?.[0] ?? "—"}<span className={styles.unit}>m</span></dd>
        </div>
        <div>
          <dt>Cook</dt>
          <dd>{recipe.cookTime.match(/\d+/)?.[0] ?? "—"}<span className={styles.unit}>m</span></dd>
        </div>
        <div>
          <dt>Serves</dt>
          <dd>{recipe.servings}</dd>
        </div>
        <div>
          <dt>Level</dt>
          <dd className={styles.level}>{recipe.difficulty}</dd>
        </div>
      </dl>

      <div className={styles.badgeRow}>
        {recipe.tags.slice(0, 3).map((tag) => (
          <span key={tag} className={styles.tag}>
            {tag}
          </span>
        ))}
      </div>
    </article>
  );
}
