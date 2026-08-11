import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "./app";
import { DEFAULT_DATA_PATH, loadAppData } from "./data";

// HTTP-level integration tests against the real backend-app/db/data.json,
// through the actual Express app (no mocking) — this is what verifies the
// full §3.10 contract end-to-end, not just the underlying pure functions
// (already covered separately in filtering.test.ts/data.test.ts/nutrition.test.ts).
const app = createApp(loadAppData(DEFAULT_DATA_PATH));

describe("GET /api/recipes", () => {
  it("returns all 15 recipes with the lightweight list shape (§3.10)", async () => {
    const res = await request(app).get("/api/recipes");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(15);
    const item = res.body[0];
    expect(Object.keys(item).sort()).toEqual(
      [
        "id",
        "title",
        "description",
        "prepTime",
        "cookTime",
        "difficulty",
        "servings",
        "tags",
        "dietary",
        "caloriesPerServing",
        "nutritionPartial",
      ].sort()
    );
    // list payload must NOT carry full detail fields
    expect(item.ingredients).toBeUndefined();
    expect(item.instructions).toBeUndefined();
  });

  it("filters by q (substring, case-insensitive) against title/description", async () => {
    const res = await request(app).get("/api/recipes").query({ q: "PIZZA" });
    expect(res.status).toBe(200);
    expect(res.body.map((r: { title: string }) => r.title)).toEqual(["Classic Margherita Pizza"]);
  });

  it("filters by tags with AND semantics", async () => {
    const res = await request(app).get("/api/recipes").query({ tags: "vegetarian,pasta" });
    expect(res.status).toBe(200);
    for (const recipe of res.body) {
      expect(recipe.tags).toEqual(expect.arrayContaining(["vegetarian", "pasta"]));
    }
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("filters by ingredients with ANY semantics", async () => {
    const res = await request(app).get("/api/recipes").query({ ingredients: "garlic" });
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("filters by dietary with AND semantics against the precomputed field", async () => {
    const res = await request(app).get("/api/recipes").query({ dietary: "vegan" });
    expect(res.status).toBe(200);
    for (const recipe of res.body) {
      expect(recipe.dietary).toContain("vegan");
    }
    // Margherita Pizza (vegetarian, not vegan — §3.2's proof case) must NOT show up
    expect(res.body.map((r: { title: string }) => r.title)).not.toContain("Classic Margherita Pizza");
  });

  it("sorts by calories descending", async () => {
    const res = await request(app).get("/api/recipes").query({ sort: "calories", order: "desc" });
    expect(res.status).toBe(200);
    const calories = res.body.map((r: { caloriesPerServing: number | null }) => r.caloriesPerServing);
    const nonNull = calories.filter((c: number | null): c is number => c !== null);
    expect(nonNull).toEqual([...nonNull].sort((a, b) => b - a));
  });

  it("filters by difficulty exact match", async () => {
    const res = await request(app).get("/api/recipes").query({ difficulty: "hard" });
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    for (const recipe of res.body) {
      expect(recipe.difficulty).toBe("hard");
    }
  });

  it("returns 400 with the error envelope for an invalid sort value", async () => {
    const res = await request(app).get("/api/recipes").query({ sort: "popularity" });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: { code: "BAD_REQUEST" } });
    expect(typeof res.body.error.message).toBe("string");
  });

  it("returns 400 for an invalid order value", async () => {
    const res = await request(app).get("/api/recipes").query({ sort: "calories", order: "sideways" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  it("does not 400 on an unrecognized filter value — just returns zero results", async () => {
    const res = await request(app).get("/api/recipes").query({ tags: "not-a-real-tag" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("GET /api/recipes/:id", () => {
  it("returns full detail for a valid ID", async () => {
    const res = await request(app).get("/api/recipes/1");
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Classic Margherita Pizza");
    expect(res.body.ingredients).toHaveLength(5);
    expect(res.body.instructions.length).toBeGreaterThan(0);
    expect(res.body.nutrition.perServing.calories).toBeGreaterThan(0);
  });

  it("returns 404 with the error envelope for an unknown ID", async () => {
    const res = await request(app).get("/api/recipes/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: { code: "NOT_FOUND" } });
  });
});

describe("GET /api/ingredients", () => {
  it("returns the full ingredient list, sorted alphabetically by name", async () => {
    const res = await request(app).get("/api/ingredients");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(40);
    const names = res.body.map((i: { name: string }) => i.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(Object.keys(res.body[0]).sort()).toEqual(["category", "id", "name"]);
  });

  it("filters by q, case-insensitive substring", async () => {
    const res = await request(app).get("/api/ingredients").query({ q: "garlic" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe("garlic");
  });
});

describe("unmatched routes", () => {
  it("returns a 404 with the standard error envelope, not Express's default HTML page", async () => {
    const res = await request(app).get("/api/nonexistent-route");
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: { code: "NOT_FOUND" } });
  });
});
