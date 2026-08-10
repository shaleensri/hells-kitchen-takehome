import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiRequestError, fetchRecipe } from "@/lib/api";
import { dedupeTagsAgainstDietary } from "@/lib/tags";
import styles from "./page.module.css";

interface RecipeDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: RecipeDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const recipe = await fetchRecipe(id);
    return { title: `${recipe.title} — Hell's Kitchen` };
  } catch {
    return { title: "Recipe — Hell's Kitchen" };
  }
}

export default async function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  const { id } = await params;

  let recipe;
  try {
    recipe = await fetchRecipe(id);
  } catch (err) {
    // A 404 from the backend renders this route's not-found.tsx; anything
    // else (network down, 500) is rethrown and caught by error.tsx.
    if (err instanceof ApiRequestError && err.isNotFound) {
      notFound();
    }
    throw err;
  }

  const { nutrition } = recipe;
  const plainTags = dedupeTagsAgainstDietary(recipe.tags, recipe.dietary);

  return (
    <div className={`container ${styles.page}`}>
      <Link href="/recipes" className={styles.backLink}>
        ← Back to recipes
      </Link>

      <header className={styles.header}>
        <h1>{recipe.title}</h1>
        <p className={styles.description}>{recipe.description}</p>

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
            <dt>Difficulty</dt>
            <dd>{recipe.difficulty}</dd>
          </div>
          <div>
            <dt>Servings</dt>
            <dd>{recipe.servings}</dd>
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
      </header>

      <div className={styles.columns}>
        <section aria-labelledby="ingredients-heading">
          <h2 id="ingredients-heading">Ingredients</h2>
          <ul className={styles.ingredientList}>
            {recipe.ingredients.map((line, i) => (
              <li key={`${line.ingredientId}-${i}`} className={styles.ingredientRow}>
                <span className={styles.amount}>
                  {line.amount} {line.unit}
                </span>
                <span>
                  {line.resolved ? line.name : `${line.ingredientId} (unknown ingredient)`}
                  {line.approximate && (
                    <span className={styles.approxBadge} title="Estimated unit conversion">
                      est.
                    </span>
                  )}
                  {!line.resolved && (
                    <span className={styles.unresolvedBadge} title="No ingredient data on file">
                      unresolved
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="instructions-heading">
          <h2 id="instructions-heading">Instructions</h2>
          <ol className={styles.instructionList}>
            {recipe.instructions.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </section>
      </div>

      <section aria-labelledby="nutrition-heading" className={styles.nutritionSection}>
        <h2 id="nutrition-heading">Nutrition (per serving)</h2>
        {nutrition.partial && (
          <p className={styles.partialNote}>
            Some ingredients couldn&rsquo;t be fully resolved — these numbers may be incomplete.
          </p>
        )}
        <table className={styles.nutritionTable}>
          <thead>
            <tr>
              <th scope="col">Calories</th>
              <th scope="col">Protein</th>
              <th scope="col">Carbs</th>
              <th scope="col">Fat</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{nutrition.perServing.calories} kcal</td>
              <td>{nutrition.perServing.protein} g</td>
              <td>{nutrition.perServing.carbs} g</td>
              <td>{nutrition.perServing.fat} g</td>
            </tr>
          </tbody>
        </table>
        <p className={styles.totalNote}>
          Recipe total ({recipe.servings} servings): {nutrition.total.calories} kcal, {nutrition.total.protein}g
          protein, {nutrition.total.carbs}g carbs, {nutrition.total.fat}g fat.
        </p>
      </section>
    </div>
  );
}
