import { describe, expect, it } from "vitest";
import type { RawData } from "@hells-kitchen/shared";
import { validateSeedData } from "./seedValidation";

function ingredient(id: string) {
  return {
    id,
    name: id,
    category: "test",
    nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    commonAllergens: [],
    dietary: [],
  };
}

describe("validateSeedData", () => {
  it("flags a recipe ingredientId with no matching ingredient record", () => {
    const data: RawData = {
      recipes: [
        {
          id: "r1",
          title: "Test Recipe",
          description: "",
          servings: 2,
          prepTime: "10 minutes",
          cookTime: "10 minutes",
          difficulty: "easy",
          ingredients: [
            { ingredientId: "flour", amount: "1", unit: "cup" },
            { ingredientId: "ghost_ingredient", amount: "1", unit: "whole" },
          ],
          instructions: [],
          tags: [],
          dateAdded: "2024-01-01T00:00:00Z",
        },
      ],
      ingredients: [ingredient("flour")],
    };

    const issues = validateSeedData(data);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ recipeId: "r1", ingredientId: "ghost_ingredient" });
  });

  it("returns no issues when every ingredientId resolves", () => {
    const data: RawData = {
      recipes: [
        {
          id: "r1",
          title: "Test Recipe",
          description: "",
          servings: 2,
          prepTime: "10 minutes",
          cookTime: "10 minutes",
          difficulty: "easy",
          ingredients: [{ ingredientId: "flour", amount: "1", unit: "cup" }],
          instructions: [],
          tags: [],
          dateAdded: "2024-01-01T00:00:00Z",
        },
      ],
      ingredients: [ingredient("flour")],
    };

    expect(validateSeedData(data)).toEqual([]);
  });

  it("catches the real dataset — running against the actual backend-app/db/data.json should find zero issues post-fix", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const raw = await fs.readFile(
      path.resolve(__dirname, "../db/data.json"),
      "utf8"
    );
    const data: RawData = JSON.parse(raw);
    expect(validateSeedData(data)).toEqual([]);
  });
});
