import { describe, expect, it } from "vitest";
import type { RawIngredient } from "@hells-kitchen/shared";
import { deriveDietaryTags } from "./dietary";

function ingredient(id: string, dietary: string[]): RawIngredient {
  return {
    id,
    name: id,
    category: "test",
    nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    commonAllergens: [],
    dietary,
  };
}

describe("deriveDietaryTags", () => {
  it("applies vegan ⊇ vegetarian — Margherita Pizza case from §3.2", () => {
    // tomato:[vegan,gluten-free], mozzarella:[vegetarian], flour:[vegan], olive_oil:[vegan,gluten-free]
    const ingredients = [
      ingredient("tomato", ["vegan", "gluten-free"]),
      ingredient("mozzarella", ["vegetarian"]),
      ingredient("flour", ["vegan"]),
      ingredient("olive_oil", ["vegan", "gluten-free"]),
    ];
    const tags = deriveDietaryTags(ingredients);
    expect(tags).toContain("vegetarian");
    expect(tags).not.toContain("vegan"); // mozzarella is only vegetarian, not vegan
    expect(tags).not.toContain("gluten-free"); // mozzarella has no gluten-free tag
  });

  it("marks a recipe vegan only if literally every ingredient is vegan", () => {
    const ingredients = [
      ingredient("chickpeas", ["vegan", "gluten-free"]),
      ingredient("olive_oil", ["vegan", "gluten-free"]),
    ];
    expect(deriveDietaryTags(ingredients)).toEqual(
      expect.arrayContaining(["vegan", "vegetarian", "gluten-free"])
    );
  });

  it("excludes a tag the moment one ingredient lacks it", () => {
    const ingredients = [
      ingredient("chicken_breast", ["keto", "high-protein"]),
      ingredient("flour", ["vegan"]), // not keto, not high-protein
    ];
    expect(deriveDietaryTags(ingredients)).toEqual([]);
  });

  it("returns an empty array for an empty ingredient list", () => {
    expect(deriveDietaryTags([])).toEqual([]);
  });
});
