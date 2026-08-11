import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "./app";
import { DEFAULT_DATA_PATH, loadAppData } from "./data";
import { RATE_LIMIT_MAX_REQUESTS, resetRateLimiter } from "./rateLimit";

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

describe("GET /api/llm-status", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  afterEach(() => {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("reports available: false when OPENAI_API_KEY isn't set (§3.3 fail-soft)", async () => {
    delete process.env.OPENAI_API_KEY;
    const res = await request(app).get("/api/llm-status");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ available: false });
  });

  it("reports available: true when OPENAI_API_KEY is set", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    const res = await request(app).get("/api/llm-status");
    expect(res.body).toEqual({ available: true });
  });
});

describe("POST /api/recipes/:id/ask", () => {
  const originalKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    resetRateLimiter();
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
    vi.unstubAllGlobals();
  });

  it("returns 404 with the standard envelope for an unknown recipe id", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    const res = await request(app).post("/api/recipes/does-not-exist/ask").send({ question: "How long?" });
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: { code: "NOT_FOUND" } });
  });

  it("returns 400 for a missing/empty question", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    const res = await request(app).post("/api/recipes/1/ask").send({ question: "   " });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: { code: "BAD_REQUEST" } });
  });

  it("returns 400 for a question over the length cap (§3.11)", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    const res = await request(app)
      .post("/api/recipes/1/ask")
      .send({ question: "a".repeat(501) });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: { code: "BAD_REQUEST" } });
  });

  it("returns 503 (not 500, not a crash) when OPENAI_API_KEY is absent — the fail-soft contract", async () => {
    delete process.env.OPENAI_API_KEY;
    const res = await request(app).post("/api/recipes/1/ask").send({ question: "How long does this take?" });
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ error: { code: "SERVICE_UNAVAILABLE" } });
  });

  it("returns 200 with an answer on a successful (mocked) provider call, grounded in the real recipe", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: "You can substitute olive oil with butter." } }] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const res = await request(app).post("/api/recipes/1/ask").send({ question: "Can I swap the oil?" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ answer: "You can substitute olive oil with butter." });
    // Confirms the real recipe (not a stub) was actually loaded and grounded into the prompt.
    const [, requestInit] = mockFetch.mock.calls[0];
    const body = JSON.parse(requestInit.body);
    expect(body.messages[0].content).toContain("Classic Margherita Pizza");
  });

  it("returns 502 when the provider errors", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })
    );

    const res = await request(app).post("/api/recipes/1/ask").send({ question: "How long does this take?" });
    expect(res.status).toBe(502);
    expect(res.body).toMatchObject({ error: { code: "UPSTREAM_ERROR" } });
  });

  it("returns 429 once a single client exceeds the rate limit", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: "ok" } }] }),
      })
    );

    let lastStatus = 0;
    for (let i = 0; i < 11; i++) {
      const res = await request(app).post("/api/recipes/1/ask").send({ question: `Question number ${i}` });
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });

  // §3.27 (Codex catch): app.ts must set `trust proxy` or req.ip — what the
  // rate limiter keys on — ignores X-Forwarded-For entirely and collapses
  // every visitor behind Railway's reverse proxy into one shared bucket.
  // Proven directly here rather than just asserting app.get("trust proxy"):
  // if two different forwarded IPs shared a bucket, the second client would
  // incorrectly inherit the first's request count and could get rate
  // limited on its very first real request.
  it("keys the rate limit on the real client IP (X-Forwarded-For), not the shared proxy connection", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: "ok" } }] }),
      })
    );

    // Exhaust the limit for one forwarded IP.
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      await request(app).post("/api/recipes/1/ask").set("X-Forwarded-For", "1.1.1.1").send({ question: `q${i}` });
    }
    const exhausted = await request(app).post("/api/recipes/1/ask").set("X-Forwarded-For", "1.1.1.1").send({ question: "one too many" });
    expect(exhausted.status).toBe(429);

    // A different forwarded IP must be unaffected — if trust proxy weren't
    // set, both requests above would collapse to the same supertest-internal
    // req.ip and this would also come back 429.
    const otherClient = await request(app).post("/api/recipes/1/ask").set("X-Forwarded-For", "2.2.2.2").send({ question: "fresh client" });
    expect(otherClient.status).toBe(200);
  });
});
