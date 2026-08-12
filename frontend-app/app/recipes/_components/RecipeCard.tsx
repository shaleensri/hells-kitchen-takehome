import Link from "next/link";
import type { RecipeListItem } from "@hells-kitchen/shared";
import { dedupeTagsAgainstDietary } from "@/lib/tags";
import { FavoriteButton } from "@/app/_components/FavoriteButton";
import { AddToListButton } from "@/app/_components/AddToListButton";
import { RecipeImage } from "@/app/_components/RecipeImage";
import styles from "./RecipeCard.module.css";

export function RecipeCard({ recipe }: { recipe: RecipeListItem }) {
  const plainTags = dedupeTagsAgainstDietary(recipe.tags, recipe.dietary);
  // A stable catalog number derived from the recipe's own id (not its
  // position in the current, possibly-filtered list) — otherwise the same
  // recipe would show a different number depending on which filters are
  // active, which reads as a bug, not a feature.
  const no = /^\d+$/.test(recipe.id) ? recipe.id.padStart(2, "0") : recipe.id;

  return (
    // Was a single <Link> wrapping the whole card; now a plain element with
    // a "stretched link" overlay instead (PLAN.md §Iteration 5). Nesting the
    // new interactive favorite/list buttons inside an <a> would be invalid
    // HTML (interactive content inside interactive content) and made click
    // targets fight each other. The overlay Link covers the full card at a
    // low z-index; the two icon buttons sit above it at a higher z-index, so
    // clicking them never reaches the link underneath — no
    // preventDefault/stopPropagation juggling needed.
    <article className={`blueprint ${styles.card}`}>
      <i className="corner tl" />
      <i className="corner tr" />
      <i className="corner bl" />
      <i className="corner br" />
      <Link href={`/recipes/${recipe.id}`} className={styles.cardLink} aria-label={recipe.title} />

      <div className={styles.thumb}>
        <RecipeImage
          recipeId={recipe.id}
          title={recipe.title}
          sizes="(max-width: 560px) 100vw, (max-width: 900px) 50vw, 320px"
        />
      </div>

      <div className={styles.cardHeader}>
        <span className={styles.no}>{no}</span>
        <h3 className={styles.title}>{recipe.title}</h3>
        <div className={styles.cardActions}>
          <AddToListButton recipeId={recipe.id} servings={recipe.servings} className={styles.saveIcon} />
          <FavoriteButton recipeId={recipe.id} className={styles.saveIcon} />
        </div>
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
    </article>
  );
}
