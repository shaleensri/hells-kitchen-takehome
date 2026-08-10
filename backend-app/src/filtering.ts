/**
 * Query parsing, filtering, and sorting for GET /api/recipes — implements
 * the contract locked in PLAN.md §3.10. Kept as pure functions over
 * PrecomputedRecipe[] (no Express types) so the semantics are testable in
 * isolation, per §3.13.
 */
import type { DietaryTag, SortField, SortOrder } from "@hells-kitchen/shared";
import type { PrecomputedRecipe } from "./data";
import { toRecipeListItem } from "./data";
import { BadRequestError } from "./errors";

export interface RecipeQuery {
  q?: string;
  tags?: string[];
  ingredients?: string[];
  dietary?: DietaryTag[];
  sort?: SortField;
  order: SortOrder;
}

const VALID_SORT_FIELDS: readonly SortField[] = ["prepTime", "cookTime", "difficulty", "calories"];
const VALID_ORDERS: readonly SortOrder[] = ["asc", "desc"];
const DIFFICULTY_RANK: Record<string, number> = { easy: 0, medium: 1, hard: 2 };

function parseCommaList(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  const raw = Array.isArray(value) ? value.join(",") : String(value);
  const items = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

/**
 * Parses raw Express query params (already-decoded strings/arrays/undefined)
 * into a validated RecipeQuery. §3.10: `sort`/`order` are strict enums —
 * they control response shape and ordering, so an invalid value is a client
 * error (400). `q`/`tags`/`ingredients`/`dietary` are lenient filters — an
 * unrecognized value (typo'd tag, nonexistent ingredient) just matches
 * nothing, the same way any search with no results behaves, not a 400.
 */
export function parseRecipeQuery(query: Record<string, unknown>): RecipeQuery {
  let sort: SortField | undefined;
  if (query.sort !== undefined) {
    if (typeof query.sort !== "string" || !VALID_SORT_FIELDS.includes(query.sort as SortField)) {
      throw new BadRequestError(
        `Invalid "sort" value ${JSON.stringify(query.sort)}. Must be one of: ${VALID_SORT_FIELDS.join(", ")}.`
      );
    }
    sort = query.sort as SortField;
  }

  let order: SortOrder = "asc";
  if (query.order !== undefined) {
    if (typeof query.order !== "string" || !VALID_ORDERS.includes(query.order as SortOrder)) {
      throw new BadRequestError(`Invalid "order" value ${JSON.stringify(query.order)}. Must be "asc" or "desc".`);
    }
    order = query.order as SortOrder;
  }

  return {
    q: typeof query.q === "string" ? query.q.trim() : undefined,
    tags: parseCommaList(query.tags)?.map((t) => t.toLowerCase()),
    ingredients: parseCommaList(query.ingredients)?.map((i) => i.toLowerCase()),
    dietary: parseCommaList(query.dietary)?.map((d) => d.toLowerCase()) as DietaryTag[] | undefined,
    sort,
    order,
  };
}

/** §3.10 semantics: q = substring on title/description; tags = AND;
 * ingredients = ANY (match by exact id or substring name); dietary = AND
 * against the boot-precomputed, normalized dietary[] (§3.2/§5.4). */
export function filterRecipes(recipes: PrecomputedRecipe[], params: RecipeQuery): PrecomputedRecipe[] {
  return recipes.filter((recipe) => {
    if (params.q) {
      const q = params.q.toLowerCase();
      const matches =
        recipe.raw.title.toLowerCase().includes(q) || recipe.raw.description.toLowerCase().includes(q);
      if (!matches) return false;
    }

    if (params.tags && params.tags.length > 0) {
      const recipeTags = recipe.raw.tags.map((t) => t.toLowerCase());
      if (!params.tags.every((t) => recipeTags.includes(t))) return false;
    }

    if (params.ingredients && params.ingredients.length > 0) {
      const hasAnyMatch = params.ingredients.some((term) =>
        recipe.resolvedIngredients.some(
          (line) => line.ingredientId.toLowerCase() === term || line.name?.toLowerCase().includes(term)
        )
      );
      if (!hasAnyMatch) return false;
    }

    if (params.dietary && params.dietary.length > 0) {
      const recipeDietary = recipe.dietary.map((d) => d.toLowerCase());
      if (!params.dietary.every((d) => recipeDietary.includes(d))) return false;
    }

    return true;
  });
}

/** null values (unparseable prep/cook time, no computable calories) always
 * sort last regardless of direction — an unknown value isn't "smallest". */
export function sortRecipes(
  recipes: PrecomputedRecipe[],
  sort: SortField | undefined,
  order: SortOrder = "asc"
): PrecomputedRecipe[] {
  if (!sort) return recipes;
  const direction = order === "desc" ? -1 : 1;

  const valueOf = (recipe: PrecomputedRecipe): number | null => {
    switch (sort) {
      case "prepTime":
        return recipe.prepTimeMinutes;
      case "cookTime":
        return recipe.cookTimeMinutes;
      case "difficulty":
        return DIFFICULTY_RANK[recipe.raw.difficulty] ?? null;
      case "calories":
        // Reuse toRecipeListItem's null-determination (only null when
        // literally nothing was resolvable) rather than re-deriving it here.
        return toRecipeListItem(recipe).caloriesPerServing;
    }
  };

  return [...recipes].sort((a, b) => {
    const av = valueOf(a);
    const bv = valueOf(b);
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    return (av - bv) * direction;
  });
}
