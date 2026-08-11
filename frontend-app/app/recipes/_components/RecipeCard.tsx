import Link from "next/link";
import type { RecipeListItem } from "@hells-kitchen/shared";
import { dedupeTagsAgainstDietary } from "@/lib/tags";
import styles from "./RecipeCard.module.css";

export function RecipeCard({ recipe }: { recipe: RecipeListItem }) {
  const plainTags = dedupeTagsAgainstDietary(recipe.tags, recipe.dietary);
  // A stable catalog number derived from the recipe's own id (not its
  // position in the current, possibly-filtered list) — otherwise the same
  // recipe would show a different number depending on which filters are
  // active, which reads as a bug, not a feature.
  const no = /^\d+$/.test(recipe.id) ? recipe.id.padStart(2, "0") : recipe.id;

  return (
    <Link href={`/recipes/${recipe.id}`} className={`blueprint ${styles.card}`}>
      <i className="corner tl" />
      <i className="corner tr" />
      <i className="corner bl" />
      <i className="corner br" />

      <div className={styles.cardHeader}>
        <span className={styles.no}>{no}</span>
        <h3 className={styles.title}>{recipe.title}</h3>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={styles.saveIcon}
          aria-label="Save recipe (coming in a future update)"
        >
          <path d="M12 17.3l-6.16 3.24 1.18-6.88L2 8.76l6.9-1L12 1.5l3.1 6.26 6.9 1-5.02 4.9 1.18 6.88z" />
        </svg>
      </div>

      <p className={styles.description}>{recipe.description}</p>
      <div className="rule" />

      <dl className={styles.meta}>
        <div>
          <dt>Prep</dt>
          <dd>
            {recipe.prepTime.match(/\d+/)?.[0] ?? "—"}
            <span className={styles.unit}>m</span>
          </dd>
        </div>
        <div>
          <dt>Cook</dt>
          <dd>
            {recipe.cookTime.match(/\d+/)?.[0] ?? "—"}
            <span className={styles.unit}>m</span>
          </dd>
        </div>
        <div>
          <dt>Serves</dt>
          <dd>{recipe.servings}</dd>
        </div>
        <div>
          <dt>Kcal</dt>
          <dd>
            {recipe.caloriesPerServing !== null ? Math.round(recipe.caloriesPerServing) : "—"}
            {recipe.nutritionPartial && (
              <span className={styles.unit} title="Some ingredients unresolved — estimate">
                ~
              </span>
            )}
          </dd>
        </div>
      </dl>

      <div className={styles.badgeRow}>
        <span className={styles.difficulty}>{recipe.difficulty}</span>
        {recipe.dietary.map((tag) => (
          <span key={tag} className={styles.dietaryTag}>
            {tag}
          </span>
        ))}
        {plainTags.slice(0, 2).map((tag) => (
          <span key={tag} className={styles.tag}>
            {tag}
          </span>
        ))}
      </div>
    </Link>
  );
}
