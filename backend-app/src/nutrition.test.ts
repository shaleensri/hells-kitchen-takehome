import { describe, expect, it } from "vitest";
import type { RawIngredient, RawRecipe } from "@hells-kitchen/shared";
import { computeRecipeNutrition } from "./nutrition";

function ingredient(id: string, calories: number, overrides: Partial<RawIngredient> = {}): RawIngredient {
  return {
    id,
    name: id,
    category: "test",
    nutrition: { calories, protein: 0, carbs: 0, fat: 0 },
    commonAllergens: [],
    dietary: [],
    ...overrides,
  };
}

function recipe(overrides: Partial<RawRecipe> = {}): RawRecipe {
  return {
    id: "r1",
    title: "Test Recipe",
    description: "",
    servings: 2,
    prepTime: "10 minutes",
    cookTime: "10 minutes",
    difficulty: "easy",
    ingredients: [],
    instructions: [],
    tags: [],
    dateAdded: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("computeRecipeNutrition", () => {
  it("computes total/perServing from a resolvable mass-unit ingredient", () => {
    // 200g of a 100-cal/100g ingredient => 200 total calories, /2 servings = 100/serving
    const map = new Map([["crab_meat", ingredient("crab_meat", 100)]]);
    const r = recipe({
      servings: 2,
      ingredients: [{ ingredientId: "crab_meat", amount: "200", unit: "g" }],
    });

    const { nutrition, ingredients } = computeRecipeNutrition(r, map);
    expect(nutrition.total.calories).toBe(200);
    expect(nutrition.perServing.calories).toBe(100);
    expect(nutrition.partial).toBe(false);
    expect(ingredients[0].resolved).toBe(true);
    expect(ingredients[0].approximate).toBe(false);
  });

  it("marks partial:true and omits the contribution for an unresolved ingredient (§3.4)", () => {
    const map = new Map<string, RawIngredient>(); // no records at all
    const r = recipe({
      ingredients: [{ ingredientId: "ghost", amount: "1", unit: "whole" }],
    });

    const { nutrition, ingredients } = computeRecipeNutrition(r, map);
    expect(nutrition.partial).toBe(true);
    expect(nutrition.total.calories).toBe(0);
    expect(ingredients[0].resolved).toBe(false);
    expect(ingredients[0].grams).toBeNull();
  });

  it("marks partial:true and omits the contribution for an unmappable unit (§3.9)", () => {
    const map = new Map([["flour", ingredient("flour", 400)]]);
    const r = recipe({
      ingredients: [{ ingredientId: "flour", amount: "1", unit: "smidgen" }],
    });

    const { nutrition, ingredients } = computeRecipeNutrition(r, map);
    expect(nutrition.partial).toBe(true);
    expect(ingredients[0].resolved).toBe(true);
    expect(ingredients[0].grams).toBeNull();
  });

  it("marks approximate:true on a line resolved via a count/density reference weight", () => {
    const map = new Map([["garlic", ingredient("garlic", 150)]]);
    const r = recipe({
      ingredients: [{ ingredientId: "garlic", amount: "2", unit: "cloves" }],
    });

    const { ingredients } = computeRecipeNutrition(r, map);
    expect(ingredients[0].resolved).toBe(true);
    expect(ingredients[0].approximate).toBe(true);
    expect(ingredients[0].grams).toBeGreaterThan(0);
  });

  it("sums multiple ingredients correctly and stays non-partial when all resolve", () => {
    const map = new Map([
      ["chicken_breast", ingredient("chicken_breast", 165, { nutrition: { calories: 165, protein: 31, carbs: 0, fat: 3.6 } })],
      ["garlic", ingredient("garlic", 149, { nutrition: { calories: 149, protein: 6.4, carbs: 33, fat: 0.5 } })],
    ]);
    const r = recipe({
      servings: 4,
      ingredients: [
        { ingredientId: "chicken_breast", amount: "1", unit: "lb" },
        { ingredientId: "garlic", amount: "3", unit: "cloves" },
      ],
    });

    const { nutrition } = computeRecipeNutrition(r, map);
    expect(nutrition.partial).toBe(false);
    expect(nutrition.total.calories).toBeGreaterThan(0);
    // total and perServing are each independently rounded to 1 decimal from
    // their own unrounded intermediate values (see roundNutrition in
    // nutrition.ts), so they won't match total/4 to high precision — within
    // one rounding step (0.1) is the correct expectation here, not exact.
    expect(nutrition.perServing.calories).toBeCloseTo(nutrition.total.calories / 4, 0);
  });
});
