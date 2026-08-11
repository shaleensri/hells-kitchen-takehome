import { describe, expect, it } from "vitest";
import type { RecipeDetail, ResolvedIngredientLine } from "@hells-kitchen/shared";
import { buildShoppingList, formatGrams } from "./shoppingList";

function line(overrides: Partial<ResolvedIngredientLine>): ResolvedIngredientLine {
  return {
    ingredientId: "flour",
    name: "Flour",
    amount: "1",
    unit: "cup",
    grams: 120,
    resolved: true,
    approximate: false,
    ...overrides,
  };
}

function recipe(overrides: Partial<RecipeDetail>): RecipeDetail {
  return {
    id: "r1",
    title: "Recipe 1",
    description: "",
    servings: 4,
    prepTime: "10 minutes",
    cookTime: "10 minutes",
    difficulty: "easy",
    tags: [],
    dietary: [],
    instructions: [],
    ingredients: [],
    nutrition: { perServing: { calories: 0, protein: 0, carbs: 0, fat: 0 }, total: { calories: 0, protein: 0, carbs: 0, fat: 0 }, partial: false },
    ...overrides,
  };
}

describe("buildShoppingList", () => {
  it("merges the same ingredientId across recipes by summing grams", () => {
    const a = recipe({ id: "a", title: "A", servings: 4, ingredients: [line({ ingredientId: "flour", grams: 200 })] });
    const b = recipe({ id: "b", title: "B", servings: 4, ingredients: [line({ ingredientId: "flour", grams: 300 })] });

    const { merged, unmerged } = buildShoppingList([
      { recipe: a, servings: 4 },
      { recipe: b, servings: 4 },
    ]);

    expect(unmerged).toEqual([]);
    expect(merged).toHaveLength(1);
    expect(merged[0].ingredientId).toBe("flour");
    expect(merged[0].grams).toBe(500);
    expect(merged[0].sources).toEqual([
      { recipeId: "a", recipeTitle: "A" },
      { recipeId: "b", recipeTitle: "B" },
    ]);
  });

  it("scales grams by servings/baseServings before merging", () => {
    const a = recipe({ id: "a", servings: 2, ingredients: [line({ ingredientId: "sugar", grams: 100 })] });

    // Requested at 4 servings (2x the base of 2) — line should double to 200.
    const { merged } = buildShoppingList([{ recipe: a, servings: 4 }]);

    expect(merged[0].grams).toBe(200);
  });

  it("keeps ingredients with no gram figure as separate unmerged lines instead of dropping them", () => {
    const a = recipe({
      id: "a",
      title: "A",
      servings: 4,
      ingredients: [line({ ingredientId: "salt", grams: null, amount: "1", unit: "pinch" })],
    });

    const { merged, unmerged } = buildShoppingList([{ recipe: a, servings: 4 }]);

    expect(merged).toEqual([]);
    expect(unmerged).toHaveLength(1);
    expect(unmerged[0]).toMatchObject({
      recipeId: "a",
      recipeTitle: "A",
      ingredientId: "salt",
      amount: "1",
      unit: "pinch",
      resolved: true,
    });
  });

  it("labels an unresolved (unknown) ingredient distinctly and still keeps it unmerged", () => {
    const a = recipe({
      id: "a",
      title: "A",
      ingredients: [line({ ingredientId: "mystery-999", name: null, grams: null, resolved: false })],
    });

    const { unmerged } = buildShoppingList([{ recipe: a, servings: a.servings }]);

    expect(unmerged[0].resolved).toBe(false);
    expect(unmerged[0].name).toBe("mystery-999 (unknown ingredient)");
  });

  it("never merges two different ingredientIds even with the same display name coincidentally", () => {
    const a = recipe({
      id: "a",
      ingredients: [
        line({ ingredientId: "onion-yellow", name: "Onion", grams: 100 }),
        line({ ingredientId: "onion-red", name: "Onion", grams: 50 }),
      ],
    });

    const { merged } = buildShoppingList([{ recipe: a, servings: a.servings }]);

    expect(merged).toHaveLength(2);
  });

  it("sorts merged and unmerged lines alphabetically by name", () => {
    const a = recipe({
      id: "a",
      ingredients: [
        line({ ingredientId: "z", name: "Zucchini", grams: 10 }),
        line({ ingredientId: "b", name: "Basil", grams: 10 }),
      ],
    });

    const { merged } = buildShoppingList([{ recipe: a, servings: a.servings }]);
    expect(merged.map((m) => m.name)).toEqual(["Basil", "Zucchini"]);
  });
});

describe("formatGrams", () => {
  it("shows sub-kilogram amounts as whole grams", () => {
    expect(formatGrams(140)).toBe("140g");
    expect(formatGrams(140.6)).toBe("141g");
  });

  it("shows exact kilogram amounts without a decimal", () => {
    expect(formatGrams(2000)).toBe("2kg");
  });

  it("shows a one-decimal kilogram amount otherwise", () => {
    expect(formatGrams(2400)).toBe("2.4kg");
  });
});
