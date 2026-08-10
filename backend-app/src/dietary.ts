/**
 * Derives a recipe's dietary compatibility from its ingredients — PLAN.md §3.2.
 *
 * A recipe satisfies a dietary tag only if every one of its ingredients does.
 * Naive literal intersection is wrong against this seed data: ingredients are
 * tagged with either "vegan" OR "vegetarian", never both, even though vegan
 * implies vegetarian in reality (proof case: Margherita Pizza is manually
 * tagged "vegetarian" in data.json, but a literal intersection of its
 * ingredients' dietary[] arrays would say otherwise — see §3.2). This module
 * applies the vegan ⊇ vegetarian equivalence before intersecting so that
 * doesn't happen.
 */
import type { DietaryTag, RawIngredient } from "@hells-kitchen/shared";

const ALL_DIETARY_TAGS: DietaryTag[] = [
  "vegan",
  "vegetarian",
  "gluten-free",
  "keto",
  "high-protein",
];

/** Does a single ingredient satisfy `tag`, applying the vegan⊇vegetarian rule? */
function ingredientSatisfies(ingredient: RawIngredient, tag: DietaryTag): boolean {
  if (ingredient.dietary.includes(tag)) return true;
  if (tag === "vegetarian" && ingredient.dietary.includes("vegan")) return true;
  return false;
}

/**
 * Given the resolved ingredient records for a recipe (skip any that are
 * unresolved per §3.4 — an unknown ingredient can't be assumed to satisfy
 * anything), return the normalized set of dietary tags the recipe satisfies.
 * An empty ingredient list satisfies nothing (vacuous truth is not useful
 * here — a recipe with no resolvable ingredients isn't meaningfully "vegan").
 */
export function deriveDietaryTags(ingredients: RawIngredient[]): DietaryTag[] {
  if (ingredients.length === 0) return [];
  return ALL_DIETARY_TAGS.filter((tag) =>
    ingredients.every((ingredient) => ingredientSatisfies(ingredient, tag))
  );
}
