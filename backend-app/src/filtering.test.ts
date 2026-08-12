import { describe, expect, it } from "vitest";
import { filterRecipes, parseRecipeQuery, sortRecipes } from "./filtering";
import { buildAppData } from "./data";
import { BadRequestError } from "./errors";
import type { RawData } from "@hells-kitchen/shared";

// Small synthetic dataset — deliberately varied on every axis these
// functions filter/sort by, so each test is unambiguous about what it's
// checking rather than relying on the real 32-recipe dataset's incidental shape.
const FIXTURE: RawData = {
  ingredients: [
    { id: "kale", name: "Kale", category: "vegetable", nutrition: { calories: 50, protein: 3, carbs: 9, fat: 0.5 }, commonAllergens: [], dietary: ["vegan", "gluten-free"] },
    { id: "chicken", name: "Chicken Breast", category: "protein", nutrition: { calories: 165, protein: 31, carbs: 0, fat: 3.6 }, commonAllergens: [], dietary: ["keto", "high-protein"] },
    { id: "cheese", name: "Cheddar Cheese", category: "dairy", nutrition: { calories: 400, protein: 25, carbs: 1, fat: 33 }, commonAllergens: ["dairy"], dietary: ["vegetarian"] },
  ],
  recipes: [
    {
      id: "fast-easy",
      title: "Fast Easy Kale Salad",
      description: "A quick vegan salad",
      servings: 2,
      prepTime: "5 minutes",
      cookTime: "0 minutes",
      difficulty: "easy",
      ingredients: [{ ingredientId: "kale", amount: "200", unit: "g" }],
      instructions: [],
      tags: ["salad", "healthy"],
      dateAdded: "2024-01-01T00:00:00Z",
    },
    {
      id: "medium-chicken",
      title: "Chicken Bowl",
      description: "A protein-heavy lunch bowl",
      servings: 2,
      prepTime: "15 minutes",
      cookTime: "20 minutes",
      difficulty: "medium",
      ingredients: [{ ingredientId: "chicken", amount: "1", unit: "lb" }],
      instructions: [],
      tags: ["healthy", "lunch"],
      dateAdded: "2024-01-01T00:00:00Z",
    },
    {
      id: "hard-cheese",
      title: "Baked Cheese Wheel",
      description: "An indulgent baked cheese dish",
      servings: 4,
      prepTime: "30 minutes",
      cookTime: "45 minutes",
      difficulty: "hard",
      ingredients: [{ ingredientId: "cheese", amount: "500", unit: "g" }],
      instructions: [],
      tags: ["dinner", "cheesy"],
      dateAdded: "2024-01-01T00:00:00Z",
    },
    {
      id: "unresolvable",
      title: "Mystery Dish",
      description: "Uses an ingredient with no data at all",
      servings: 1,
      prepTime: "garbled time string",
      cookTime: "10 minutes",
      difficulty: "easy",
      ingredients: [{ ingredientId: "ghost_ingredient", amount: "1", unit: "whole" }],
      instructions: [],
      tags: ["healthy"],
      dateAdded: "2024-01-01T00:00:00Z",
    },
  ],
};

function fixtureRecipes() {
  return buildAppData(FIXTURE).recipes;
}

describe("parseRecipeQuery", () => {
  it("parses q, comma-separated tags/ingredients/dietary, sort, order", () => {
    const parsed = parseRecipeQuery({
      q: " chicken ",
      tags: "Healthy, Lunch",
      ingredients: "Chicken Breast",
      dietary: "keto,High-Protein",
      sort: "calories",
      order: "desc",
    });
    expect(parsed.q).toBe("chicken");
    expect(parsed.tags).toEqual(["healthy", "lunch"]);
    expect(parsed.ingredients).toEqual(["chicken breast"]);
    expect(parsed.dietary).toEqual(["keto", "high-protein"]);
    expect(parsed.sort).toBe("calories");
    expect(parsed.order).toBe("desc");
  });

  it("parses and lowercases difficulty", () => {
    expect(parseRecipeQuery({ difficulty: "Hard" }).difficulty).toBe("hard");
  });

  it("defaults order to asc when omitted", () => {
    expect(parseRecipeQuery({}).order).toBe("asc");
  });

  it("throws BadRequestError on an invalid sort value", () => {
    expect(() => parseRecipeQuery({ sort: "popularity" })).toThrow(BadRequestError);
  });

  it("throws BadRequestError on an invalid order value", () => {
    expect(() => parseRecipeQuery({ sort: "calories", order: "sideways" })).toThrow(BadRequestError);
  });

  it("does NOT throw on an unrecognized dietary/tag/ingredient value (lenient filters, §3.10)", () => {
    expect(() => parseRecipeQuery({ dietary: "made-up-diet", tags: "not-a-real-tag" })).not.toThrow();
  });
});

describe("filterRecipes", () => {
  it("q matches title OR description, case-insensitive substring", () => {
    const recipes = fixtureRecipes();
    const byTitle = filterRecipes(recipes, { q: "kale", order: "asc" });
    expect(byTitle.map((r) => r.raw.id)).toEqual(["fast-easy"]);

    const byDescription = filterRecipes(recipes, { q: "indulgent", order: "asc" });
    expect(byDescription.map((r) => r.raw.id)).toEqual(["hard-cheese"]);
  });

  it("tags use AND semantics — recipe must have every requested tag", () => {
    const recipes = fixtureRecipes();
    const result = filterRecipes(recipes, { tags: ["healthy", "lunch"], order: "asc" });
    // only medium-chicken has BOTH; fast-easy and unresolvable have "healthy" but not "lunch"
    expect(result.map((r) => r.raw.id)).toEqual(["medium-chicken"]);
  });

  it("ingredients use ANY semantics — matches by exact id or substring name", () => {
    const recipes = fixtureRecipes();
    const byId = filterRecipes(recipes, { ingredients: ["kale"], order: "asc" });
    expect(byId.map((r) => r.raw.id)).toEqual(["fast-easy"]);

    const byNameSubstring = filterRecipes(recipes, { ingredients: ["cheddar"], order: "asc" });
    expect(byNameSubstring.map((r) => r.raw.id)).toEqual(["hard-cheese"]);

    const anyOfTwo = filterRecipes(recipes, { ingredients: ["kale", "cheddar"], order: "asc" });
    expect(anyOfTwo.map((r) => r.raw.id).sort()).toEqual(["fast-easy", "hard-cheese"]);
  });

  it("dietary uses AND semantics against the precomputed dietary[] field", () => {
    const recipes = fixtureRecipes();
    const result = filterRecipes(recipes, { dietary: ["vegan"], order: "asc" });
    expect(result.map((r) => r.raw.id)).toEqual(["fast-easy"]);
  });

  it("an unresolved ingredient means the recipe never matches a dietary filter (§3.15 regression)", () => {
    const recipes = fixtureRecipes();
    // "unresolvable" has zero dietary tags (ghost_ingredient can't be verified), so no dietary filter should return it
    const result = filterRecipes(recipes, { dietary: ["vegan"], order: "asc" });
    expect(result.map((r) => r.raw.id)).not.toContain("unresolvable");
  });

  it("combines multiple filters with implicit AND across filter types", () => {
    const recipes = fixtureRecipes();
    const result = filterRecipes(recipes, { tags: ["healthy"], dietary: ["vegan"], order: "asc" });
    expect(result.map((r) => r.raw.id)).toEqual(["fast-easy"]);
  });

  it("difficulty filters by exact match (distinct from sort=difficulty)", () => {
    const recipes = fixtureRecipes();
    const result = filterRecipes(recipes, { difficulty: "hard", order: "asc" });
    expect(result.map((r) => r.raw.id)).toEqual(["hard-cheese"]);
  });

  it("difficulty is lenient like other filters — an unrecognized value yields zero results, not a throw", () => {
    const recipes = fixtureRecipes();
    // @ts-expect-error deliberately passing a bogus value to check runtime leniency
    expect(filterRecipes(recipes, { difficulty: "extreme", order: "asc" })).toEqual([]);
  });

  it("returns everything when no filters are given", () => {
    const recipes = fixtureRecipes();
    expect(filterRecipes(recipes, { order: "asc" })).toHaveLength(4);
  });
});

describe("sortRecipes", () => {
  it("sorts by prepTime ascending, with an unparseable duration sorted last", () => {
    const recipes = fixtureRecipes();
    const sorted = sortRecipes(recipes, "prepTime", "asc");
    // fast-easy=5, medium-chicken=15, hard-cheese=30, unresolvable=null (garbled string)
    expect(sorted.map((r) => r.raw.id)).toEqual(["fast-easy", "medium-chicken", "hard-cheese", "unresolvable"]);
  });

  it("sorts by prepTime descending — nulls still last, not first", () => {
    const recipes = fixtureRecipes();
    const sorted = sortRecipes(recipes, "prepTime", "desc");
    expect(sorted.map((r) => r.raw.id)).toEqual(["hard-cheese", "medium-chicken", "fast-easy", "unresolvable"]);
  });

  it("sorts by difficulty on a fixed easy<medium<hard rank, not alphabetically", () => {
    const recipes = fixtureRecipes();
    const sorted = sortRecipes(recipes, "difficulty", "asc");
    // alphabetical would be easy, easy, hard, medium — fixed rank is easy, easy, medium, hard
    const ranks = sorted.map((r) => r.raw.difficulty);
    expect(ranks).toEqual(["easy", "easy", "medium", "hard"]);
  });

  it("sorts by calories, using the same null rule as the list response", () => {
    const recipes = fixtureRecipes();
    const sorted = sortRecipes(recipes, "calories", "asc");
    expect(sorted[sorted.length - 1].raw.id).toBe("unresolvable"); // no resolvable grams at all
  });

  it("returns the input unchanged (same order) when no sort is given", () => {
    const recipes = fixtureRecipes();
    expect(sortRecipes(recipes, undefined, "asc").map((r) => r.raw.id)).toEqual(
      recipes.map((r) => r.raw.id)
    );
  });
});
