import { describe, expect, it, vi } from "vitest";
import type { PrecomputedRecipe } from "./data";
import { LlmProviderError } from "./llm";
import {
  buildCompactCatalog,
  buildFinderSystemPrompt,
  findRecipesWithAssistant,
  MAX_FINDER_MATCHES,
  MAX_MAIN_INGREDIENTS,
  parseFinderResponse,
  sanitizeMatches,
} from "./recipeFinder";

function fakeRecipe(overrides: Partial<PrecomputedRecipe["raw"]> = {}, ingredientCount = 3): PrecomputedRecipe {
  return {
    raw: {
      id: "1",
      title: "Test Soup",
      description: "A test soup",
      servings: 4,
      prepTime: "10 minutes",
      cookTime: "20 minutes",
      difficulty: "easy",
      ingredients: [],
      instructions: [],
      tags: ["soup", "healthy"],
      dateAdded: "2026-01-01T00:00:00Z",
      ...overrides,
    },
    dietary: ["vegan", "vegetarian", "gluten-free"],
    resolvedIngredients: Array.from({ length: ingredientCount }, (_, i) => ({
      ingredientId: `ing${i}`,
      name: `Ingredient ${i}`,
      amount: "1",
      unit: "cup",
      grams: 100,
      resolved: true,
      approximate: false,
    })),
    nutrition: {
      perServing: { calories: 200, protein: 10, carbs: 20, fat: 5 },
      total: { calories: 800, protein: 40, carbs: 80, fat: 20 },
      partial: false,
    },
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
  };
}

describe("buildCompactCatalog", () => {
  it("includes the recipe id, title, and key fields", () => {
    const catalog = buildCompactCatalog([fakeRecipe({ id: "7", title: "Vegetable Curry" })]);
    expect(catalog).toContain("Recipe 7: Vegetable Curry");
    expect(catalog).toContain("Tags: soup, healthy");
    expect(catalog).toContain("Dietary: vegan, vegetarian, gluten-free");
    expect(catalog).toContain("Difficulty: easy");
    expect(catalog).toContain("200 kcal, 10g protein per serving");
  });

  it("caps main ingredients at MAX_MAIN_INGREDIENTS, in stored order, no ranking", () => {
    const catalog = buildCompactCatalog([fakeRecipe({}, MAX_MAIN_INGREDIENTS + 3)]);
    const line = catalog.split("\n").find((l) => l.startsWith("Main ingredients:"))!;
    const listed = line.replace("Main ingredients: ", "").split(", ");
    expect(listed).toHaveLength(MAX_MAIN_INGREDIENTS);
    expect(listed).toEqual(["Ingredient 0", "Ingredient 1", "Ingredient 2", "Ingredient 3", "Ingredient 4"]);
  });

  it("separates multiple recipes with a blank line", () => {
    const catalog = buildCompactCatalog([fakeRecipe({ id: "1" }), fakeRecipe({ id: "2" })]);
    expect(catalog).toContain("Recipe 1:");
    expect(catalog).toContain("Recipe 2:");
    expect(catalog.split("\n\n")).toHaveLength(2);
  });

  it("flags partial nutrition in the catalog line rather than showing a misleading number silently", () => {
    const recipe = fakeRecipe();
    recipe.nutrition.partial = true;
    const catalog = buildCompactCatalog([recipe]);
    expect(catalog).toContain("partial — some ingredients unresolved");
  });
});

describe("buildFinderSystemPrompt", () => {
  it("instructs the model not to invent recipes and to return strict JSON", () => {
    const prompt = buildFinderSystemPrompt("Recipe 1: Test", undefined);
    expect(prompt.toLowerCase()).toContain("never invent");
    expect(prompt).toContain('{"summary"');
    expect(prompt).toContain(`at most ${6} matches`);
  });

  it("includes the dietary profile when provided", () => {
    const prompt = buildFinderSystemPrompt("Recipe 1: Test", ["vegan", "gluten-free"]);
    expect(prompt).toContain("vegan, gluten-free");
  });

  it("omits any dietary-restriction mention when no profile is provided", () => {
    const prompt = buildFinderSystemPrompt("Recipe 1: Test", undefined);
    expect(prompt).not.toContain("saved these dietary restrictions");
  });
});

describe("parseFinderResponse", () => {
  it("parses a well-formed response", () => {
    const result = parseFinderResponse('{"summary": "Here you go", "matches": [{"recipeId": "1", "reason": "It fits"}]}');
    expect(result).toEqual({ summary: "Here you go", matches: [{ recipeId: "1", reason: "It fits" }] });
  });

  it("strips a ```json code fence as a defensive fallback", () => {
    const result = parseFinderResponse('```json\n{"summary": "ok", "matches": []}\n```');
    expect(result.summary).toBe("ok");
  });

  it("strips a plain ``` fence too", () => {
    const result = parseFinderResponse('```\n{"summary": "ok", "matches": []}\n```');
    expect(result.summary).toBe("ok");
  });

  it("throws LlmProviderError on malformed JSON", () => {
    expect(() => parseFinderResponse("not json at all")).toThrow(LlmProviderError);
  });

  it("throws LlmProviderError when the shape is wrong (missing matches)", () => {
    expect(() => parseFinderResponse('{"summary": "ok"}')).toThrow(LlmProviderError);
  });

  it("throws LlmProviderError when summary isn't a string", () => {
    expect(() => parseFinderResponse('{"summary": 5, "matches": []}')).toThrow(LlmProviderError);
  });

  it("drops individual match entries missing recipeId or reason, keeps the well-formed ones", () => {
    const result = parseFinderResponse(
      '{"summary": "ok", "matches": [{"recipeId": "1", "reason": "good"}, {"recipeId": "2"}, "not an object"]}'
    );
    expect(result.matches).toEqual([{ recipeId: "1", reason: "good" }]);
  });
});

describe("sanitizeMatches", () => {
  const validIds = new Set(["1", "2", "3"]);

  it("keeps matches whose recipeId is in validIds", () => {
    const result = sanitizeMatches([{ recipeId: "1", reason: "a" }], validIds);
    expect(result).toEqual([{ recipeId: "1", reason: "a" }]);
  });

  it("discards a recipeId the model invented (not in validIds) — the actual trust boundary", () => {
    const result = sanitizeMatches(
      [
        { recipeId: "1", reason: "real" },
        { recipeId: "999", reason: "invented by the model" },
      ],
      validIds
    );
    expect(result).toEqual([{ recipeId: "1", reason: "real" }]);
  });

  it("dedupes repeated recipeIds, keeping the first occurrence", () => {
    const result = sanitizeMatches(
      [
        { recipeId: "1", reason: "first" },
        { recipeId: "1", reason: "duplicate" },
      ],
      validIds
    );
    expect(result).toEqual([{ recipeId: "1", reason: "first" }]);
  });

  it(`caps at MAX_FINDER_MATCHES (${MAX_FINDER_MATCHES})`, () => {
    const manyIds = Array.from({ length: MAX_FINDER_MATCHES + 5 }, (_, i) => String(i));
    const bigValidIds = new Set(manyIds);
    const rawMatches = manyIds.map((id) => ({ recipeId: id, reason: "x" }));
    const result = sanitizeMatches(rawMatches, bigValidIds);
    expect(result).toHaveLength(MAX_FINDER_MATCHES);
  });

  it("dedupes before capping, so unique valid matches aren't lost to an early duplicate", () => {
    const rawMatches = [
      { recipeId: "1", reason: "dup" },
      { recipeId: "1", reason: "dup again" },
      { recipeId: "2", reason: "unique" },
      { recipeId: "3", reason: "unique" },
    ];
    const result = sanitizeMatches(rawMatches, validIds);
    expect(result.map((m) => m.recipeId)).toEqual(["1", "2", "3"]);
  });
});

describe("findRecipesWithAssistant (end to end, mocked fetch)", () => {
  function fakeFetch(jsonBody: unknown): typeof fetch {
    return vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: JSON.stringify(jsonBody) } }] }),
    }) as unknown as typeof fetch;
  }

  it("requests JSON mode from the provider", async () => {
    const fetchImpl = fakeFetch({ summary: "ok", matches: [] });
    await findRecipesWithAssistant({
      recipes: [fakeRecipe({ id: "1" })],
      query: "quick vegan dinner",
      apiKey: "test-key",
      fetchImpl,
    });
    const [, requestInit] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(requestInit.body as string);
    expect(body.response_format).toEqual({ type: "json_object" });
  });

  it("sends the catalog and query as separate system/user messages", async () => {
    const fetchImpl = fakeFetch({ summary: "ok", matches: [] });
    await findRecipesWithAssistant({
      recipes: [fakeRecipe({ id: "1", title: "Curry Soup" })],
      query: "quick vegan dinner",
      apiKey: "test-key",
      fetchImpl,
    });
    const [, requestInit] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(requestInit.body as string);
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[0].content).toContain("Curry Soup");
    expect(body.messages[1]).toEqual({ role: "user", content: "quick vegan dinner" });
  });

  it("end-to-end drops an invented recipeId before returning results", async () => {
    const fetchImpl = fakeFetch({
      summary: "Found one match",
      matches: [
        { recipeId: "1", reason: "real recipe" },
        { recipeId: "invented-id-999", reason: "hallucinated" },
      ],
    });
    const result = await findRecipesWithAssistant({
      recipes: [fakeRecipe({ id: "1" })],
      query: "anything",
      apiKey: "test-key",
      fetchImpl,
    });
    expect(result.matches).toEqual([{ recipeId: "1", reason: "real recipe" }]);
  });
});
