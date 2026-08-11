import Link from "next/link";
import type { RecipeListItem } from "@hells-kitchen/shared";
import { dedupeTagsAgainstDietary } from "@/lib/tags";
import styles from "./RecipeCard.module.css";

export function RecipeCard({ recipe }: { recipe: RecipeListItem }) {
  const plainTags = dedupeTagsAgainstDietary(recipe.tags, recipe.dietary);
  return (
    <Link href={`/recipes/${recipe.id}`} className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.title}>{recipe.title}</h2>
        <span className={`${styles.difficulty} ${styles[`difficulty-${recipe.difficulty}`]}`}>
          {recipe.difficulty}
        </span>
      </div>
      <p className={styles.description}>{recipe.description}</p>
      <div className={styles.divider} />
      <dl className={styles.meta}>
        <div>
          <dt>Prep</dt>
          <dd>{recipe.prepTime}</dd>
        </div>
        <div>
          <dt>Cook</dt>
          <dd>{recipe.cookTime}</dd>
        </div>
        <div>
          <dt>Serves</dt>
          <dd>{recipe.servings}</dd>
        </div>
        <div>
          <dt>Calories</dt>
          <dd>
            {recipe.caloriesPerServing !== null
              ? `${recipe.nutritionPartial ? "≈" : ""}${Math.round(recipe.caloriesPerServing)}/serving`
              : "—"}
          </dd>
        </div>
      </dl>
      {(plainTags.length > 0 || recipe.dietary.length > 0) && (
        <ul className={styles.tagList}>
          {recipe.dietary.map((tag) => (
            <li key={tag} className={`${styles.tag} ${styles.dietaryTag}`}>
              {tag}
            </li>
          ))}
          {plainTags.map((tag) => (
            <li key={tag} className={styles.tag}>
              {tag}
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}
