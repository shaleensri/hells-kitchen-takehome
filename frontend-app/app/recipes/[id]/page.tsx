import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiRequestError, fetchRecipe } from "@/lib/api";
import { dedupeTagsAgainstDietary } from "@/lib/tags";
import { FavoriteButton } from "@/app/_components/FavoriteButton";
import { AddToListButton } from "@/app/_components/AddToListButton";
import { RecipeImage } from "@/app/_components/RecipeImage";
import { ScalableRecipeBody } from "./ScalableRecipeBody";
import { AskAboutRecipe } from "./AskAboutRecipe";
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

  const plainTags = dedupeTagsAgainstDietary(recipe.tags, recipe.dietary);
  const no = /^\d+$/.test(recipe.id) ? recipe.id.padStart(2, "0") : recipe.id;
  const eyebrowTags = recipe.tags.slice(0, 2).join(" / ") || recipe.difficulty;

  return (
    <div className={`container ${styles.page}`}>
      <Link href="/recipes" className={styles.backLink}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M19 12H5" />
          <path d="M12 19l-7-7 7-7" />
        </svg>
        Back to index
      </Link>

      <div className={styles.headerRow}>
        <div className={styles.headerText}>
          <div className="eyebrow" style={{ marginTop: "var(--space-5)" }}>
            Entry {no} — {eyebrowTags}
          </div>
          <h1 className={styles.title}>{recipe.title}</h1>
          <p className={styles.description}>{recipe.description}</p>

          {(plainTags.length > 0 || recipe.dietary.length > 0) && (
            <ul className={styles.tagList}>
              {recipe.dietary.map((tag) => (
                <li key={tag} className={styles.dietaryTag}>
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

          <div className={styles.actions}>
            {/* Adds at the recipe's base servings (not the live-scaled count
                below) — see lib/shoppingList.ts's file header for why. */}
            <AddToListButton recipeId={recipe.id} servings={recipe.servings} variant="button" />
            <FavoriteButton recipeId={recipe.id} variant="button" />
          </div>
        </div>

        <div className={`blueprint ${styles.headerImage}`}>
          <i className="corner tl" />
          <i className="corner tr" />
          <i className="corner bl" />
          <i className="corner br" />
          <RecipeImage recipeId={recipe.id} title={recipe.title} sizes="(max-width: 720px) 100vw, 280px" priority />
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
          <div className="label">Calories / serving</div>
          <div className={styles.statValue}>{recipe.nutrition.perServing.calories}</div>
        </div>
      </div>

      <ScalableRecipeBody recipe={recipe} />
      <AskAboutRecipe recipe={recipe} />
    </div>
  );
}
