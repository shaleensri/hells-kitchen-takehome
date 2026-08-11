import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiRequestError,
  askAboutRecipe,
  fetchIngredients,
  fetchLlmStatus,
  fetchRecipe,
  fetchRecipes,
  findRecipesWithAssistant,
} from "./api";

function mockFetchOnce(response: { status: number; body: unknown }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    json: async () => response.body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchRecipes", () => {
  it("builds the query string per §3.10 (comma-separated lists, only defined params)", async () => {
    const fetchMock = mockFetchOnce({ status: 200, body: [] });

    await fetchRecipes({
      q: "pizza",
      tags: ["italian", "dinner"],
      ingredients: ["garlic"],
      dietary: ["vegan", "gluten-free"],
      sort: "calories",
      order: "desc",
    });

    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.pathname).toBe("/api/recipes");
    expect(calledUrl.searchParams.get("q")).toBe("pizza");
    expect(calledUrl.searchParams.get("tags")).toBe("italian,dinner");
    expect(calledUrl.searchParams.get("ingredients")).toBe("garlic");
    expect(calledUrl.searchParams.get("dietary")).toBe("vegan,gluten-free");
    expect(calledUrl.searchParams.get("sort")).toBe("calories");
    expect(calledUrl.searchParams.get("order")).toBe("desc");
  });

  it("omits params that weren't provided rather than sending empty strings", async () => {
    const fetchMock = mockFetchOnce({ status: 200, body: [] });
    await fetchRecipes({ q: "soup" });
    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.has("tags")).toBe(false);
    expect(calledUrl.searchParams.has("sort")).toBe(false);
  });

  it("returns the parsed JSON body on success", async () => {
    mockFetchOnce({ status: 200, body: [{ id: "1", title: "Test Recipe" }] });
    const result = await fetchRecipes();
    expect(result).toEqual([{ id: "1", title: "Test Recipe" }]);
  });

  it("throws ApiRequestError with the backend's code/message on a non-2xx response", async () => {
    mockFetchOnce({
      status: 400,
      body: { error: { code: "BAD_REQUEST", message: "Invalid sort value." } },
    });
    await expect(fetchRecipes({ sort: "bogus" as never })).rejects.toMatchObject({
      status: 400,
      code: "BAD_REQUEST",
      message: "Invalid sort value.",
    });
  });
});

describe("fetchRecipe", () => {
  it("URL-encodes the id and hits /api/recipes/:id", async () => {
    const fetchMock = mockFetchOnce({ status: 200, body: { id: "a b", title: "X" } });
    await fetchRecipe("a b");
    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.pathname).toBe("/api/recipes/a%20b");
  });

  it("surfaces a 404 as an ApiRequestError with isNotFound true", async () => {
    mockFetchOnce({ status: 404, body: { error: { code: "NOT_FOUND", message: "No recipe." } } });
    try {
      await fetchRecipe("missing");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiRequestError);
      expect((err as ApiRequestError).isNotFound).toBe(true);
    }
  });
});

describe("fetchIngredients", () => {
  it("hits /api/ingredients with an optional q param", async () => {
    const fetchMock = mockFetchOnce({ status: 200, body: [] });
    await fetchIngredients({ q: "garlic" });
    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.pathname).toBe("/api/ingredients");
    expect(calledUrl.searchParams.get("q")).toBe("garlic");
  });
});

describe("fetchLlmStatus", () => {
  it("hits GET /api/llm-status and returns the availability flag", async () => {
    const fetchMock = mockFetchOnce({ status: 200, body: { available: true } });
    const result = await fetchLlmStatus();
    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.pathname).toBe("/api/llm-status");
    expect(result).toEqual({ available: true });
  });
});

describe("askAboutRecipe", () => {
  it("POSTs the question and dietary profile to /api/recipes/:id/ask", async () => {
    const fetchMock = mockFetchOnce({ status: 200, body: { answer: "Yes, that works." } });
    const result = await askAboutRecipe("1", "Can I use butter?", ["vegan"]);

    const [calledUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new URL(calledUrl).pathname).toBe("/api/recipes/1/ask");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ question: "Can I use butter?", dietaryProfile: ["vegan"] });
    expect(result).toEqual({ answer: "Yes, that works." });
  });

  it("includes prior conversation history in the POST body when provided", async () => {
    const fetchMock = mockFetchOnce({ status: 200, body: { answer: "The second one." } });
    const history = [{ question: "Which is better, A or B?", answer: "Both work." }];
    await askAboutRecipe("1", "Pick one for me.", undefined, history);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ question: "Pick one for me.", dietaryProfile: undefined, history });
  });

  it("surfaces a 503 (feature disabled) as an ApiRequestError", async () => {
    mockFetchOnce({ status: 503, body: { error: { code: "SERVICE_UNAVAILABLE", message: "Not configured." } } });
    await expect(askAboutRecipe("1", "q")).rejects.toMatchObject({ status: 503, code: "SERVICE_UNAVAILABLE" });
  });
});

describe("findRecipesWithAssistant", () => {
  it("POSTs the query and dietary profile to /api/assistant/find-recipes", async () => {
    const body = {
      summary: "Here's a match",
      matches: [{ recipe: { id: "1", title: "Test" }, reason: "It's quick" }],
    };
    const fetchMock = mockFetchOnce({ status: 200, body });
    const result = await findRecipesWithAssistant("quick vegan dinner", ["vegan"]);

    const [calledUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new URL(calledUrl).pathname).toBe("/api/assistant/find-recipes");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ query: "quick vegan dinner", dietaryProfile: ["vegan"] });
    expect(result).toEqual(body);
  });

  it("surfaces a 503 (feature disabled) as an ApiRequestError, same as the recipe assistant", async () => {
    mockFetchOnce({ status: 503, body: { error: { code: "SERVICE_UNAVAILABLE", message: "Not configured." } } });
    await expect(findRecipesWithAssistant("dinner")).rejects.toMatchObject({ status: 503, code: "SERVICE_UNAVAILABLE" });
  });

  it("surfaces a 429 as an ApiRequestError", async () => {
    mockFetchOnce({ status: 429, body: { error: { code: "RATE_LIMITED", message: "Too many searches." } } });
    await expect(findRecipesWithAssistant("dinner")).rejects.toMatchObject({ status: 429, code: "RATE_LIMITED" });
  });
});

describe("network failure", () => {
  it("wraps a thrown fetch (e.g. connection refused) as an ApiRequestError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("fetch failed"))
    );
    await expect(fetchRecipes()).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });
});
