"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { RecipeImage } from "@/app/_components/RecipeImage";
import { useCustomRecipes } from "@/lib/customRecipes";
import styles from "./customRecipe.module.css";

export function CustomRecipeDetail({ id }: { id: string }) {
  const router = useRouter();
  const { customRecipes, hydrated, remove } = useCustomRecipes();
  const recipe = customRecipes.find((r) => r.id === id) ?? null;

  if (!hydrated) {
    return (
      <div className={`container ${styles.page}`}>
        <p className={styles.sourceNote}>Loading custom recipe…</p>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className={`container ${styles.page}`}>
        <div className={styles.notFound}>
          <div className="eyebrow">Local recipe</div>
          <h1 className={styles.title}>Custom recipe not found</h1>
          <p>It may have been deleted or stored in another browser.</p>
          <Link href="/recipes" className="btn btn-secondary">
            Back to recipes
          </Link>
        </div>
      </div>
    );
  }

  function handleDelete() {
    if (!recipe) return;
    const ok = window.confirm("Delete this custom recipe? The original catalog recipe will not be changed.");
    if (!ok) return;
    remove(recipe.id);
    router.push("/recipes");
  }

  return (
    <div className={`container ${styles.page}`}>
      <Link href="/recipes" className={styles.backLink}>
        Back to index
      </Link>

      <div className={styles.headerRow}>
        <div className={styles.headerText}>
          <span className={styles.badge}>Custom recipe</span>
          <h1 className={styles.title}>{recipe.title}</h1>
          <p className={styles.description}>{recipe.description}</p>
          <p className={styles.sourceNote}>
            Saved locally in this browser. Original:{" "}
            <Link href={`/recipes/${encodeURIComponent(recipe.sourceRecipeId)}`}>view catalog recipe</Link>
          </p>

          {recipe.tags.length > 0 && (
            <ul className={styles.tagList}>
              {recipe.tags.map((tag) => (
                <li key={tag} className={styles.tag}>
                  {tag}
                </li>
              ))}
            </ul>
          )}

          <div className={styles.actions}>
            <Link href={`/custom-recipes/${encodeURIComponent(recipe.id)}/edit`} className="btn btn-primary">
              Edit custom recipe
            </Link>
            <button type="button" className="btn btn-secondary" onClick={handleDelete}>
              Delete
            </button>
          </div>
        </div>

        <div className={`blueprint ${styles.headerImage}`}>
          <i className="corner tl" />
          <i className="corner tr" />
          <i className="corner bl" />
          <i className="corner br" />
          <RecipeImage recipeId={recipe.sourceRecipeId} title={recipe.title} sizes="(max-width: 720px) 100vw, 280px" priority />
        </div>
      </div>

      <div className={styles.statsStrip}>
        <div>
          <div className="label">Prep</div>
          <div className={styles.statValue}>{recipe.prepTime}</div>
        </div>
        <div>
          <div className="label">Cook</div>
          <div className={styles.statValue}>{recipe.cookTime}</div>
        </div>
        <div>
          <div className="label">Difficulty</div>
          <div className={styles.statValue}>{recipe.difficulty}</div>
        </div>
        <div>
          <div className="label">Servings</div>
          <div className={styles.statValue}>{recipe.servings}</div>
        </div>
      </div>

      <div className={styles.columns}>
        <section aria-labelledby="custom-ingredients-heading">
          <h2 id="custom-ingredients-heading">Ingredients</h2>
          <ul className={styles.list}>
            {recipe.ingredients.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="custom-method-heading">
          <h2 id="custom-method-heading">Method</h2>
          <ol className={styles.list}>
            {recipe.instructions.map((step, i) => (
              <li key={i} className={styles.instruction}>
                <span className={styles.stepNo}>{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className={`blueprint ${styles.notice}`} aria-labelledby="custom-nutrition-heading">
        <i className="corner tl" />
        <i className="corner tr" />
        <i className="corner bl" />
        <i className="corner br" />
        <h2 id="custom-nutrition-heading" className={styles.nutritionHeading}>
          Nutrition
        </h2>
        <p>Nutrition is calculated for catalog recipes. Custom recipe nutrition is not calculated yet.</p>
      </section>
    </div>
  );
}
