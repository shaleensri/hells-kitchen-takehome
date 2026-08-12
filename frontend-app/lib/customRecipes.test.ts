import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RecipeDetail, ResolvedIngredientLine } from "@hells-kitchen/shared";
import {
  CUSTOM_RECIPES_STORAGE_KEY,
  createCustomRecipeFromRecipe,
  deleteCustomRecipe,
  getCustomRecipes,
  ingredientLineToText,
  isCustomRecipeId,
  saveCustomRecipe,
  updateCustomRecipe,
  validateCustomRecipeInput,
} from "./customRecipes";

function setupStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    },
    dispatchEvent: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
}

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

function recipe(overrides: Partial<RecipeDetail> = {}): RecipeDetail {
  return {
    id: "7",
    title: "Vegetable Curry",
    description: "A cozy curry.",
    servings: 4,
    prepTime: "15 minutes",
    cookTime: "25 minutes",
    difficulty: "medium",
    tags: ["dinner", "quick"],
    dietary: ["vegan", "vegetarian"],
    ingredients: [line({ amount: "2", unit: "cup", name: "Chickpeas" })],
    instructions: ["Simmer everything."],
    nutrition: {
      perServing: { calories: 300, protein: 12, carbs: 40, fat: 9 },
      total: { calories: 1200, protein: 48, carbs: 160, fat: 36 },
      partial: false,
    },
    ...overrides,
  };
}

beforeEach(setupStorage);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isCustomRecipeId", () => {
  it("accepts custom ids and rejects catalog ids", () => {
    expect(isCustomRecipeId("custom:abc")).toBe(true);
    expect(isCustomRecipeId("custom:")).toBe(false);
    expect(isCustomRecipeId("1")).toBe(false);
  });
});

describe("ingredientLineToText", () => {
  it("uses resolved ingredient names", () => {
    expect(ingredientLineToText(line({ amount: "2", unit: "tbsp", name: "Olive Oil" }))).toBe("2 tbsp Olive Oil");
  });

  it("uses the established unknown-ingredient fallback for unresolved lines", () => {
    expect(
      ingredientLineToText(line({ ingredientId: "mystery", name: null, resolved: false, amount: "1", unit: "cup" }))
    ).toBe("1 cup mystery (unknown ingredient)");
  });
});

describe("createCustomRecipeFromRecipe", () => {
  it("creates a new custom recipe without carrying computed nutrition or dietary claims", () => {
    const original = recipe();
    const custom = createCustomRecipeFromRecipe(original);

    expect(custom.id).toMatch(/^custom:/);
    expect(custom.sourceRecipeId).toBe("7");
    expect(custom.isCustom).toBe(true);
    expect(custom.ingredients).toEqual(["2 cup Chickpeas"]);
    expect("nutrition" in custom).toBe(false);
    expect("dietary" in custom).toBe(false);
    expect(original.title).toBe("Vegetable Curry");
  });
});

describe("custom recipe storage", () => {
  it("returns [] for missing, malformed, non-array, or invalid storage", () => {
    expect(getCustomRecipes()).toEqual([]);
    window.localStorage.setItem(CUSTOM_RECIPES_STORAGE_KEY, "{nope");
    expect(getCustomRecipes()).toEqual([]);
    window.localStorage.setItem(CUSTOM_RECIPES_STORAGE_KEY, JSON.stringify({ id: "custom:x" }));
    expect(getCustomRecipes()).toEqual([]);
    window.localStorage.setItem(CUSTOM_RECIPES_STORAGE_KEY, JSON.stringify([{ id: "1", title: "bad" }]));
    expect(getCustomRecipes()).toEqual([]);
    window.localStorage.setItem(
      CUSTOM_RECIPES_STORAGE_KEY,
      JSON.stringify([{ ...createCustomRecipeFromRecipe(recipe()), title: "", ingredients: [], instructions: [] }])
    );
    expect(getCustomRecipes()).toEqual([]);
  });

  it("saves, loads, updates existing ids, and deletes only the requested recipe", () => {
    const a = createCustomRecipeFromRecipe(recipe({ id: "1", title: "A" }));
    const b = createCustomRecipeFromRecipe(recipe({ id: "2", title: "B" }));
    saveCustomRecipe(a);
    saveCustomRecipe(b);
    expect(getCustomRecipes().map((r) => r.title)).toEqual(["A", "B"]);

    saveCustomRecipe({ ...a, title: "A changed" });
    expect(getCustomRecipes().map((r) => r.title)).toEqual(["A changed", "B"]);

    deleteCustomRecipe(a.id);
    expect(getCustomRecipes().map((r) => r.title)).toEqual(["B"]);
  });

  it("rejects a non-custom-prefixed id on save/update/delete", () => {
    const custom = createCustomRecipeFromRecipe(recipe());
    saveCustomRecipe({ ...custom, id: "7" });
    expect(getCustomRecipes()).toEqual([]);
    expect(updateCustomRecipe("7", custom)).toBeNull();
    deleteCustomRecipe("7");
    expect(getCustomRecipes()).toEqual([]);
  });
});

describe("validation and update", () => {
  it("rejects missing essentials and invalid servings", () => {
    expect(
      validateCustomRecipeInput({
        title: "",
        description: "",
        servings: 0,
        prepTime: "",
        cookTime: "",
        difficulty: "easy",
        tags: [],
        ingredients: [],
        instructions: [],
      }).errors
    ).toEqual([
      "Title is required.",
      "Servings must be between 1 and 24.",
      "Add at least one ingredient.",
      "Add at least one instruction.",
    ]);

    expect(validateCustomRecipeInput({ ...createCustomRecipeFromRecipe(recipe()), servings: 24 }).valid).toBe(true);
    expect(validateCustomRecipeInput({ ...createCustomRecipeFromRecipe(recipe()), servings: 25 }).valid).toBe(false);
    expect(validateCustomRecipeInput({ ...createCustomRecipeFromRecipe(recipe()), servings: 1.5 }).valid).toBe(false);
  });

  it("normalizes fields when updating", () => {
    const custom = createCustomRecipeFromRecipe(recipe());
    saveCustomRecipe(custom);
    const next = updateCustomRecipe(custom.id, {
      title: "  My Curry  ",
      description: "  Better  ",
      servings: 2,
      prepTime: "  5 minutes ",
      cookTime: " 10 minutes ",
      difficulty: "hard",
      tags: [" spicy ", "", "dinner"],
      ingredients: [" tofu ", "", "rice"],
      instructions: [" stir ", "", "serve"],
    });

    expect(next).toMatchObject({
      title: "My Curry",
      description: "Better",
      servings: 2,
      prepTime: "5 minutes",
      cookTime: "10 minutes",
      difficulty: "hard",
      tags: ["spicy", "dinner"],
      ingredients: ["tofu", "rice"],
      instructions: ["stir", "serve"],
    });
  });
});
