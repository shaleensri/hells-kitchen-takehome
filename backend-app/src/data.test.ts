import { describe, expect, it } from "vitest";
import {
  DEFAULT_DATA_PATH,
  loadAppData,
  toRecipeDetail,
  toRecipeListItem,
} from "./data";

describe("loadAppData against the real backend-app/db/data.json", () => {
  const appData = loadAppData(DEFAULT_DATA_PATH);

  it("loads all 15 recipes and finds zero seed-validation issues post-fix (§3.4)", () => {
    expect(appData.recipes).toHaveLength(15);
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
