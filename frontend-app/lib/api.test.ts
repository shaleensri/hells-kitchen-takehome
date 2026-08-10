import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError, fetchIngredients, fetchRecipe, fetchRecipes } from "./api";

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

describe("network failure", () => {
  it("wraps a thrown fetch (e.g. connection refused) as an ApiRequestError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("fetch failed"))
    );
    await expect(fetchRecipes()).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });
});
