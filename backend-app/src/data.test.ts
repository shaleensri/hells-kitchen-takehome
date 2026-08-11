import { describe, expect, it } from "vitest";
import type { RawData } from "@hells-kitchen/shared";
import {
  DEFAULT_DATA_PATH,
  buildAppData,
  loadAppData,
  toRecipeDetail,
  toRecipeListItem,
} from "./data";

describe("loadAppData against the real backend-app/db/data.json", () => {
  const appData = loadAppData(DEFAULT_DATA_PATH);

  it("loads all 32 recipes (15 original + 17 from Iteration 10 Batches 1-2, §3.31) and finds zero seed-validation issues", () => {
    expect(appData.recipes).toHaveLength(32);
    expect(appData.seedValidationIssues).toEqual([]);
  });

  it("derives 'vegetarian' (not 'vegan') for Margherita Pizza — the §3.2 proof case", () => {
    const pizza = appData.recipesById.get("1");
    expect(pizza?.raw.title).toBe("Classic Margherita Pizza");
    expect(pizza?.dietary).toContain("vegetarian");
    expect(pizza?.dietary).not.toContain("vegan");
  });

  it("derives 'vegan' for a recipe whose seed tags already say vegan (Vegetable Curry)", () => {
    const curry = appData.recipes.find((r) => r.raw.title === "Vegetable Curry");
    expect(curry?.dietary).toContain("vegan");
    expect(curry?.dietary).toContain("vegetarian");
  });

  it("produces a non-null caloriesPerServing for every recipe now that the 8 ingredients are fixed", () => {
    for (const p of appData.recipes) {
      const listItem = toRecipeListItem(p);
      expect(listItem.caloriesPerServing).not.toBeNull();
    }
  });

  it("toRecipeDetail carries the full resolved ingredient list and nutrition", () => {
    const pizza = appData.recipesById.get("1")!;
    const detail = toRecipeDetail(pizza);
    expect(detail.ingredients).toHaveLength(5); // tomato, mozzarella, basil, flour, olive_oil
    expect(detail.ingredients.every((line) => line.resolved)).toBe(true);
    expect(detail.nutrition.partial).toBe(false);
    expect(detail.nutrition.perServing.calories).toBeGreaterThan(0);
  });

  it("parses prepTime/cookTime strings into minutes for sorting (§4.2 item 2)", () => {
    const pizza = appData.recipesById.get("1")!;
    expect(pizza.prepTimeMinutes).toBe(20);
    expect(pizza.cookTimeMinutes).toBe(15);
  });
});

describe("dietary derivation with an unresolved ingredient (regression, caught on external review)", () => {
  function veganIngredient(id: string): RawData["ingredients"][number] {
    return {
      id,
      name: id,
      category: "test",
      nutrition: { calories: 10, protein: 0, carbs: 0, fat: 0 },
      commonAllergens: [],
      dietary: ["vegan", "gluten-free"],
    };
  }

  it("does NOT claim 'vegan' for a recipe with several vegan ingredients plus one unresolved ingredient", () => {
    const data: RawData = {
      recipes: [
        {
          id: "r1",
          title: "Suspicious Salad",
          description: "",
          servings: 2,
          prepTime: "10 minutes",
          cookTime: "0 minutes",
          difficulty: "easy",
          ingredients: [
            { ingredientId: "lettuce", amount: "1", unit: "g" },
            { ingredientId: "cucumber_test", amount: "1", unit: "g" },
            { ingredientId: "tomato_test", amount: "1", unit: "g" },
            // unresolved — no matching ingredient record below. Could be
            // anything, including meat; must not be silently ignored.
            { ingredientId: "mystery_ingredient", amount: "1", unit: "whole" },
          ],
          instructions: [],
          tags: [],
          dateAdded: "2024-01-01T00:00:00Z",
        },
      ],
      ingredients: [
        veganIngredient("lettuce"),
        veganIngredient("cucumber_test"),
        veganIngredient("tomato_test"),
      ],
    };

    const appData = buildAppData(data);
    const recipe = appData.recipesById.get("r1")!;
    expect(recipe.dietary).toEqual([]);
  });

  it("still derives dietary tags normally once every ingredient resolves", () => {
    const data: RawData = {
      recipes: [
        {
          id: "r1",
          title: "Actually Vegan Salad",
          description: "",
          servings: 2,
          prepTime: "10 minutes",
          cookTime: "0 minutes",
          difficulty: "easy",
          ingredients: [
            { ingredientId: "lettuce", amount: "1", unit: "g" },
            { ingredientId: "cucumber_test", amount: "1", unit: "g" },
          ],
          instructions: [],
          tags: [],
          dateAdded: "2024-01-01T00:00:00Z",
        },
      ],
      ingredients: [veganIngredient("lettuce"), veganIngredient("cucumber_test")],
    };

    const appData = buildAppData(data);
    const recipe = appData.recipesById.get("r1")!;
    expect(recipe.dietary).toContain("vegan");
  });
});
