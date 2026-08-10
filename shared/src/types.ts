/**
 * Single source of truth for Recipe/Ingredient shapes, shared by backend-app and
 * frontend-app via the @hells-kitchen/shared workspace package.
 * See PLAN.md §4.3 (why shared types exist) and §3.10 (the API contract these
 * response shapes implement).
 */

// ---------------------------------------------------------------------------
// Raw shapes — exactly what lives in db/data.json (see backend-app/db/data.json)
// ---------------------------------------------------------------------------

export type Difficulty = "easy" | "medium" | "hard";

export interface RawNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** An ingredient record as stored in data.json's `ingredients` array. */
export interface RawIngredient {
  id: string;
  name: string;
  category: string;
  /**
   * PLAN.md §3.5: treated as the ingredient's nutrition per 100g. This is a
   * documented assumption, not a claim that the seed data was originally
   * authored on that basis — see §3.5 for the full reasoning.
   */
  nutrition: RawNutrition;
  commonAllergens: string[];
  dietary: string[];
}

/** One ingredient line within a recipe, as stored in data.json. */
export interface RawRecipeIngredientLine {
  ingredientId: string;
  /** A numeric string, sometimes a simple fraction like "1/3" (see recipe 15). */
  amount: string;
  unit: string;
}

/** A recipe record as stored in data.json's `recipes` array. */
export interface RawRecipe {
  id: string;
  title: string;
  description: string;
  servings: number;
  /** Free-text duration, e.g. "20 minutes" — not a number, see duration.ts. */
  prepTime: string;
  cookTime: string;
  difficulty: Difficulty;
  ingredients: RawRecipeIngredientLine[];
  instructions: string[];
  tags: string[];
  dateAdded: string;
}

export interface RawData {
  recipes: RawRecipe[];
  ingredients: RawIngredient[];
}

// ---------------------------------------------------------------------------
// Derived / computed shapes — precomputed at boot (PLAN.md §5.4) and served
// through the API. Not part of data.json.
// ---------------------------------------------------------------------------

/**
 * One ingredient line resolved against the ingredients table, with unit
 * conversion applied. See PLAN.md §3.4 (unresolved ingredients) and §3.9
 * (the partial/approximate fallback contract).
 */
export interface ResolvedIngredientLine {
  ingredientId: string;
  /** Null if the ingredientId has no matching record (§3.4) — should not happen
   * post-fix, but the contract must hold regardless. */
  name: string | null;
  amount: string;
  unit: string;
  /** Grams this line contributes, or null if it couldn't be resolved to a mass. */
  grams: number | null;
  /** False if ingredientId has no record in the ingredients table (§3.4). */
  resolved: boolean;
  /** True if `grams` was computed via an estimated reference weight/density (§3.9). */
  approximate: boolean;
}

export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * Aggregate nutrition for a recipe. PLAN.md §3.9: `partial` is true if any
 * ingredient line's contribution had to be omitted (unresolved ingredient or
 * unmappable unit) — the totals below simply don't include that line.
 */
export interface ComputedNutrition {
  perServing: NutritionInfo;
  total: NutritionInfo;
  partial: boolean;
}

/** Normalized dietary tags a recipe satisfies — see PLAN.md §3.2. */
export type DietaryTag =
  | "vegan"
  | "vegetarian"
  | "gluten-free"
  | "keto"
  | "high-protein";

// ---------------------------------------------------------------------------
// API response shapes — PLAN.md §3.10
// ---------------------------------------------------------------------------

/** GET /api/recipes list item — deliberately lightweight, see §3.10. */
export interface RecipeListItem {
  id: string;
  title: string;
  description: string;
  prepTime: string;
  cookTime: string;
  difficulty: Difficulty;
  servings: number;
  tags: string[];
  dietary: DietaryTag[];
  caloriesPerServing: number | null;
  nutritionPartial: boolean;
}

/** GET /api/recipes/:id response — full detail, see §3.10. */
export interface RecipeDetail {
  id: string;
  title: string;
  description: string;
  servings: number;
  prepTime: string;
  cookTime: string;
  difficulty: Difficulty;
  tags: string[];
  dietary: DietaryTag[];
  instructions: string[];
  ingredients: ResolvedIngredientLine[];
  nutrition: ComputedNutrition;
}

/** GET /api/ingredients item — see §3.10. */
export interface IngredientListItem {
  id: string;
  name: string;
  category: string;
}

/** Consistent error envelope for every endpoint — see §3.10. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}

export type SortField = "prepTime" | "cookTime" | "difficulty" | "calories";
export type SortOrder = "asc" | "desc";
