"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  MAX_CUSTOM_RECIPE_SERVINGS,
  MIN_CUSTOM_RECIPE_SERVINGS,
  getCustomRecipe,
  useCustomRecipes,
  validateCustomRecipeInput,
  type EditableCustomRecipeFields,
} from "@/lib/customRecipes";
import styles from "../customRecipe.module.css";

function linesToText(lines: string[]): string {
  return lines.join("\n");
}

function textToLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function EditCustomRecipeForm({ id }: { id: string }) {
  const router = useRouter();
  const { customRecipes, hydrated, update } = useCustomRecipes();
  const recipe = customRecipes.find((r) => r.id === id) ?? (!hydrated ? getCustomRecipe(id) : null);
  const [errors, setErrors] = useState<string[]>([]);

  const initial = useMemo(() => {
    if (!recipe) return null;
    return {
      title: recipe.title,
      description: recipe.description,
      servings: recipe.servings,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      difficulty: recipe.difficulty,
      tags: recipe.tags.join(", "),
      ingredients: linesToText(recipe.ingredients),
      instructions: linesToText(recipe.instructions),
    };
  }, [recipe]);

  if (!hydrated) {
    return (
      <div className={`container ${styles.page}`}>
        <p className={styles.sourceNote}>Loading custom recipe…</p>
      </div>
    );
  }

  if (!recipe || !initial) {
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

  const currentRecipe = recipe;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fields: EditableCustomRecipeFields = {
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      servings: Number(form.get("servings")),
      prepTime: String(form.get("prepTime") ?? ""),
      cookTime: String(form.get("cookTime") ?? ""),
      difficulty: String(form.get("difficulty") ?? "easy") as EditableCustomRecipeFields["difficulty"],
      tags: String(form.get("tags") ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      ingredients: textToLines(String(form.get("ingredients") ?? "")),
      instructions: textToLines(String(form.get("instructions") ?? "")),
    };

    const validation = validateCustomRecipeInput(fields);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    const next = update(currentRecipe.id, fields);
    if (!next) {
      setErrors(["Could not save this custom recipe."]);
      return;
    }
    router.push(`/custom-recipes/${encodeURIComponent(next.id)}`);
  }

  return (
    <div className={`container ${styles.page}`}>
      <Link href={`/custom-recipes/${encodeURIComponent(currentRecipe.id)}`} className={styles.backLink}>
        Back to custom recipe
      </Link>

      <div className="eyebrow" style={{ marginTop: "var(--space-5)" }}>
        Local copy
      </div>
      <h1 className={styles.title}>Edit custom recipe</h1>
      <p className={styles.description}>
        Changes are saved locally in this browser. The original catalog recipe is not changed.
      </p>

      <form className={styles.form} onSubmit={handleSubmit}>
        {errors.length > 0 && (
          <div className={styles.errors} role="alert">
            <ul>
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.field}>
          <label htmlFor="title">Title</label>
          <input id="title" name="title" defaultValue={initial.title} required />
        </div>

        <div className={styles.field}>
          <label htmlFor="description">Description</label>
          <textarea id="description" name="description" defaultValue={initial.description} />
        </div>

        <div className={styles.fieldGrid}>
          <div className={styles.field}>
            <label htmlFor="servings">Servings</label>
            <input
              id="servings"
              name="servings"
              type="number"
              min={MIN_CUSTOM_RECIPE_SERVINGS}
              max={MAX_CUSTOM_RECIPE_SERVINGS}
              step="1"
              defaultValue={initial.servings}
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="difficulty">Difficulty</label>
            <select id="difficulty" name="difficulty" defaultValue={initial.difficulty}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="prepTime">Prep time</label>
            <input id="prepTime" name="prepTime" defaultValue={initial.prepTime} />
          </div>
          <div className={styles.field}>
            <label htmlFor="cookTime">Cook time</label>
            <input id="cookTime" name="cookTime" defaultValue={initial.cookTime} />
          </div>
          <div className={`${styles.field} ${styles.fullWidth}`}>
            <label htmlFor="tags">Tags</label>
            <input id="tags" name="tags" defaultValue={initial.tags} placeholder="dinner, spicy, weeknight" />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="ingredients">Ingredients — one per line</label>
          <textarea id="ingredients" name="ingredients" defaultValue={initial.ingredients} required />
        </div>

        <div className={styles.field}>
          <label htmlFor="instructions">Method — one step per line</label>
          <textarea id="instructions" name="instructions" defaultValue={initial.instructions} required />
        </div>

        <div className={styles.formActions}>
          <button type="submit" className="btn btn-primary">
            Save custom recipe
          </button>
          <Link href={`/custom-recipes/${encodeURIComponent(currentRecipe.id)}`} className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
