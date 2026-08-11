import { describe, expect, it, vi } from "vitest";
import type { RecipeDetail } from "@hells-kitchen/shared";
import { askAboutRecipe, LlmProviderError, LlmTimeoutError } from "./llm";

function fakeRecipe(overrides: Partial<RecipeDetail> = {}): RecipeDetail {
  return {
    id: "1",
    title: "Test Pizza",
    description: "A test recipe",
    servings: 4,
    prepTime: "10 minutes",
    cookTime: "10 minutes",
    difficulty: "easy",
    tags: ["italian"],
    dietary: ["vegetarian"],
    instructions: ["Preheat oven", "Bake"],
    ingredients: [
      { ingredientId: "flour", name: "Flour", amount: "2", unit: "cup", grams: 240, resolved: true, approximate: false },
    ],
    nutrition: {
      perServing: { calories: 300, protein: 10, carbs: 40, fat: 8 },
      total: { calories: 1200, protein: 40, carbs: 160, fat: 32 },
      partial: false,
    },
    ...overrides,
  };
}

function fakeFetch(response: Partial<Response> & { jsonBody?: unknown }): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    json: async () => response.jsonBody,
  }) as unknown as typeof fetch;
}

describe("askAboutRecipe", () => {
  it("returns the assistant's answer on a successful call", async () => {
    const fetchImpl = fakeFetch({ jsonBody: { choices: [{ message: { content: "Yes, you can use butter instead." } }] } });

    const answer = await askAboutRecipe({
      recipe: fakeRecipe(),
      question: "Can I substitute the oil?",
      apiKey: "test-key",
      fetchImpl,
    });

    expect(answer).toBe("Yes, you can use butter instead.");
  });

  it("sends a grounded system prompt containing the recipe's real ingredients and instructions", async () => {
    const fetchImpl = fakeFetch({ jsonBody: { choices: [{ message: { content: "ok" } }] } });

    await askAboutRecipe({
      recipe: fakeRecipe(),
      question: "How long does it take?",
      apiKey: "test-key",
      fetchImpl,
    });

    const [, requestInit] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(requestInit.body as string);
    const systemMessage = body.messages.find((m: { role: string }) => m.role === "system").content as string;

    expect(systemMessage).toContain("Test Pizza");
    expect(systemMessage).toContain("Flour");
    expect(systemMessage).toContain("Preheat oven");
    expect(body.messages.find((m: { role: string }) => m.role === "user").content).toBe("How long does it take?");
  });

  it("includes the dietary profile in the prompt when provided, and asks it to proactively flag conflicts", async () => {
    const fetchImpl = fakeFetch({ jsonBody: { choices: [{ message: { content: "ok" } }] } });

    await askAboutRecipe({
      recipe: fakeRecipe(),
      question: "Tell me about this dish.",
      apiKey: "test-key",
      dietaryProfile: ["vegan", "gluten-free"],
      fetchImpl,
    });

    const [, requestInit] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(requestInit.body as string);
    const systemMessage = body.messages.find((m: { role: string }) => m.role === "system").content as string;
    expect(systemMessage).toContain("vegan, gluten-free");
    expect(systemMessage.toLowerCase()).toContain("proactively");
  });

  it("includes prior history as alternating user/assistant messages before the current question (§3.29)", async () => {
    const fetchImpl = fakeFetch({ jsonBody: { choices: [{ message: { content: "ok" } }] } });

    await askAboutRecipe({
      recipe: fakeRecipe(),
      question: "What about the second one?",
      apiKey: "test-key",
      history: [
        { question: "Any substitution ideas?", answer: "You could use butter instead of oil, or a plant-based cheese." },
      ],
      fetchImpl,
    });

    const [, requestInit] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(requestInit.body as string);
    // system, then the history's user+assistant pair, then the new question — in that exact order.
    expect(body.messages.map((m: { role: string }) => m.role)).toEqual(["system", "user", "assistant", "user"]);
    expect(body.messages[1].content).toBe("Any substitution ideas?");
    expect(body.messages[2].content).toBe("You could use butter instead of oil, or a plant-based cheese.");
    expect(body.messages[3].content).toBe("What about the second one?");
  });

  it("works exactly as before when no history is passed (backward compatible)", async () => {
    const fetchImpl = fakeFetch({ jsonBody: { choices: [{ message: { content: "ok" } }] } });

    await askAboutRecipe({ recipe: fakeRecipe(), question: "q", apiKey: "test-key", fetchImpl });

    const [, requestInit] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(requestInit.body as string);
    expect(body.messages.map((m: { role: string }) => m.role)).toEqual(["system", "user"]);
  });

  it("uses the pinned default model unless OPENAI_MODEL/model override is set", async () => {
    const fetchImpl = fakeFetch({ jsonBody: { choices: [{ message: { content: "ok" } }] } });

    await askAboutRecipe({ recipe: fakeRecipe(), question: "q", apiKey: "test-key", fetchImpl });

    const [, requestInit] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(JSON.parse(requestInit.body as string).model).toBe("gpt-4o-mini");
  });

  it("throws LlmProviderError when the provider responds with a non-2xx status", async () => {
    const fetchImpl = fakeFetch({ ok: false, status: 500, jsonBody: {} });

    await expect(askAboutRecipe({ recipe: fakeRecipe(), question: "q", apiKey: "test-key", fetchImpl })).rejects.toThrow(
      LlmProviderError
    );
  });

  it("throws LlmProviderError when the provider returns no usable answer text", async () => {
    const fetchImpl = fakeFetch({ jsonBody: { choices: [] } });

    await expect(askAboutRecipe({ recipe: fakeRecipe(), question: "q", apiKey: "test-key", fetchImpl })).rejects.toThrow(
      LlmProviderError
    );
  });

  it("throws LlmTimeoutError when the request is aborted (times out)", async () => {
    const fetchImpl = vi.fn().mockImplementation(() => {
      const err = new Error("The operation was aborted");
      err.name = "AbortError";
      return Promise.reject(err);
    }) as unknown as typeof fetch;

    await expect(askAboutRecipe({ recipe: fakeRecipe(), question: "q", apiKey: "test-key", fetchImpl })).rejects.toThrow(
      LlmTimeoutError
    );
  });

  it("throws LlmProviderError (not a raw exception) when the network call itself fails", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

    await expect(askAboutRecipe({ recipe: fakeRecipe(), question: "q", apiKey: "test-key", fetchImpl })).rejects.toThrow(
      LlmProviderError
    );
  });
});
