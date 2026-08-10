/**
 * Nutrition calculation module — PLAN.md §3.5 (basis assumption) and §3.9
 * (fallback contract). Built on the shared unit-conversion module; the
 * ingredient-lookup/aggregation logic here is backend-specific.
 *
 * BASIS ASSUMPTION (§3.5, now resolved — was explicitly deferred earlier in
 * planning): each ingredient's `nutrition` object in data.json is treated as
 * its value **per 100g**. Spot-checking the seed data found the values were
 * not sourced on a single consistent real-world basis (some matched per-tbsp,
 * some per-cup, some genuinely per-100g) — there's no basis we could recover
 * that would be more "correct" than any other, so per-100g was chosen as one
 * simple, internally-consistent convention applied uniformly via the shared
 * unit-conversion module, not as a claim of real-world nutritional accuracy.
 * State this explicitly in Candidate Notes (Iteration 8).
 */
import type {
  ComputedNutrition,
  NutritionInfo,
  RawIngredient,
  RawRecipe,
  ResolvedIngredientLine,
} from "@hells-kitchen/shared";
import { convertToGrams } from "@hells-kitchen/shared";

const EMPTY_NUTRITION: NutritionInfo = { calories: 0, protein: 0, carbs: 0, fat: 0 };

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function addScaled(total: NutritionInfo, per100g: NutritionInfo, grams: number): NutritionInfo {
  const factor = grams / 100;
  return {
    calories: total.calories + per100g.calories * factor,
    protein: total.protein + per100g.protein * factor,
    carbs: total.carbs + per100g.carbs * factor,
    fat: total.fat + per100g.fat * factor,
  };
}

function roundNutrition(n: NutritionInfo): NutritionInfo {
  return {
    calories: round(n.calories),
    protein: round(n.protein),
    carbs: round(n.carbs),
    fat: round(n.fat),
  };
}

/**
 * Resolve every ingredient line in a recipe (name lookup + gram conversion)
 * and compute the recipe's aggregate nutrition. Never crashes on an
 * unresolved ingredient or an unmappable unit — both degrade gracefully per
 * §3.4/§3.9's shared "say what we don't know, don't fabricate precision"
 * contract, surfaced as `resolved`/`approximate` per-line and `partial`
 * on the aggregate.
 */
export function computeRecipeNutrition(
  recipe: RawRecipe,
  ingredientsById: Map<string, RawIngredient>
): { ingredients: ResolvedIngredientLine[]; nutrition: ComputedNutrition } {
  let total: NutritionInfo = { ...EMPTY_NUTRITION };
  let partial = false;
  const resolvedIngredients: ResolvedIngredientLine[] = [];

  for (const line of recipe.ingredients) {
    const ingredient = ingredientsById.get(line.ingredientId);

    if (!ingredient) {
      // §3.4: unresolved ingredient — omit contribution, mark partial.
      resolvedIngredients.push({
        ingredientId: line.ingredientId,
        name: null,
        amount: line.amount,
        unit: line.unit,
        grams: null,
        resolved: false,
        approximate: false,
      });
      partial = true;
      continue;
    }

    const conversion = convertToGrams(line.ingredientId, line.amount, line.unit);

    if (conversion.grams === null) {
      // §3.9: ingredient known, but this unit can't be resolved to grams —
      // omit the numeric contribution, mark partial. Do not guess.
      resolvedIngredients.push({
        ingredientId: line.ingredientId,
        name: ingredient.name,
        amount: line.amount,
        unit: line.unit,
        grams: null,
        resolved: true,
        approximate: false,
      });
      partial = true;
      continue;
    }

    resolvedIngredients.push({
      ingredientId: line.ingredientId,
      name: ingredient.name,
      amount: line.amount,
      unit: line.unit,
      grams: round(conversion.grams, 2),
      resolved: true,
      approximate: conversion.approximate,
    });
    total = addScaled(total, ingredient.nutrition, conversion.grams);
  }

  const servings = recipe.servings > 0 ? recipe.servings : 1;
  const perServing: NutritionInfo = {
    calories: total.calories / servings,
    protein: total.protein / servings,
    carbs: total.carbs / servings,
    fat: total.fat / servings,
  };

  return {
    ingredients: resolvedIngredients,
    nutrition: {
      total: roundNutrition(total),
      perServing: roundNutrition(perServing),
      partial,
    },
  };
}
