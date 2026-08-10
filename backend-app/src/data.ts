/**
 * Data access layer — PLAN.md §5.4. Loads db/data.json once, runs seed
 * validation (§3.4), and precomputes per-recipe dietary[] (§3.2) and
 * nutrition (§3.5/§3.9) so list/detail requests never redo this work
 * per-call. This is the in-memory "database" the API routes (Iteration 2)
 * will read from.
 */
import fs from "node:fs";
import path from "node:path";
import type {
  DietaryTag,
  IngredientListItem,
  RawData,
  RawIngredient,
  RawRecipe,
  RecipeDetail,
  RecipeListItem,
  ResolvedIngredientLine,
  ComputedNutrition,
} from "@hells-kitchen/shared";
import { parseDurationMinutes } from "@hells-kitchen/shared";
import { computeRecipeNutrition } from "./nutrition";
import { deriveDietaryTags } from "./dietary";
import { logSeedValidationIssues, validateSeedData, type SeedValidationIssue } from "./seedValidation";

export interface PrecomputedRecipe {
  raw: RawRecipe;
  dietary: DietaryTag[];
  resolvedIngredients: ResolvedIngredientLine[];
  nutrition: ComputedNutrition;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
}

export interface AppData {
  ingredientsById: Map<string, RawIngredient>;
  recipes: PrecomputedRecipe[];
  recipesById: Map<string, PrecomputedRecipe>;
  seedValidationIssues: SeedValidationIssue[];
}

export const DEFAULT_DATA_PATH = path.join(__dirname, "../db/data.json");

export function loadRawData(filePath: string): RawData {
  const contents = fs.readFileSync(filePath, "utf8");
  return JSON.parse(contents) as RawData;
}

/** Pure function: raw data in, fully precomputed AppData out. Kept separate
 * from loadRawData so tests can build AppData from an in-memory fixture
 * without touching the filesystem. */
export function buildAppData(raw: RawData): AppData {
  const issues = validateSeedData(raw);
  logSeedValidationIssues(issues);

  const ingredientsById = new Map(raw.ingredients.map((i) => [i.id, i]));

  const recipes: PrecomputedRecipe[] = raw.recipes.map((recipe) => {
    const { ingredients: resolvedIngredients, nutrition } = computeRecipeNutrition(
      recipe,
      ingredientsById
    );
    const resolvedIngredientRecords = resolvedIngredients
      .filter((line) => line.resolved)
      .map((line) => ingredientsById.get(line.ingredientId))
      .filter((i): i is RawIngredient => Boolean(i));
    const dietary = deriveDietaryTags(resolvedIngredientRecords);

    return {
      raw: recipe,
      dietary,
      resolvedIngredients,
      nutrition,
      prepTimeMinutes: parseDurationMinutes(recipe.prepTime),
      cookTimeMinutes: parseDurationMinutes(recipe.cookTime),
    };
  });

  return {
    ingredientsById,
    recipes,
    recipesById: new Map(recipes.map((r) => [r.raw.id, r])),
    seedValidationIssues: issues,
  };
}

export function loadAppData(filePath: string = DEFAULT_DATA_PATH): AppData {
  return buildAppData(loadRawData(filePath));
}

// ---------------------------------------------------------------------------
// Projections to the API response shapes locked in PLAN.md §3.10. Iteration 2
// wires these into actual routes; kept here so the shape is decided once.
// ---------------------------------------------------------------------------

export function toRecipeListItem(p: PrecomputedRecipe): RecipeListItem {
  const hasAnyResolvedGrams = p.resolvedIngredients.some((line) => line.grams !== null);
  return {
    id: p.raw.id,
    title: p.raw.title,
    description: p.raw.description,
    prepTime: p.raw.prepTime,
    cookTime: p.raw.cookTime,
    difficulty: p.raw.difficulty,
    servings: p.raw.servings,
    tags: p.raw.tags,
    dietary: p.dietary,
    // null only when literally nothing could be computed — a partial-but-nonzero
    // total still shows, flagged via nutritionPartial (see toRecipeListItem doc
    // in PLAN.md §3.10's list response shape).
    caloriesPerServing: hasAnyResolvedGrams ? p.nutrition.perServing.calories : null,
    nutritionPartial: p.nutrition.partial,
  };
}

export function toRecipeDetail(p: PrecomputedRecipe): RecipeDetail {
  return {
    id: p.raw.id,
    title: p.raw.title,
    description: p.raw.description,
    servings: p.raw.servings,
    prepTime: p.raw.prepTime,
    cookTime: p.raw.cookTime,
    difficulty: p.raw.difficulty,
    tags: p.raw.tags,
    dietary: p.dietary,
    instructions: p.raw.instructions,
    ingredients: p.resolvedIngredients,
    nutrition: p.nutrition,
  };
}

export function toIngredientListItem(ingredient: RawIngredient): IngredientListItem {
  return { id: ingredient.id, name: ingredient.name, category: ingredient.category };
}
