import { describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { BadRequestError, errorHandler, NotFoundError } from "./errors";

// Gap caught on Iteration 2 review: app.test.ts covers the 400/404 paths
// (real ApiError subclasses thrown from real routes) but nothing exercised
// the generic 500 fallback for a non-ApiError. Testing errorHandler directly
// against a minimal throwaway app rather than adding a test-only route to
// the real app.ts — keeps production route code free of test-only surface.
describe("errorHandler", () => {
  it("maps a BadRequestError to a 400 with the standard envelope", async () => {
    const app = express();
    app.get("/route", () => {
      throw new BadRequestError("bad input");
    });
    app.use(errorHandler);

    const res = await request(app).get("/route");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { code: "BAD_REQUEST", message: "bad input" } });
  });

  it("maps a NotFoundError to a 404 with the standard envelope", async () => {
    const app = express();
    app.get("/route", () => {
      throw new NotFoundError("missing thing");
    });
    app.use(errorHandler);

    const res = await request(app).get("/route");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: "NOT_FOUND", message: "missing thing" } });
  });

  it("maps any non-ApiError (unexpected failure) to a 500 with the INTERNAL_ERROR envelope, never leaking the real message", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const app = express();
    app.get("/route", () => {
      throw new Error("some internal implementation detail that shouldn't reach the client");
    });
    app.use(errorHandler);

    const res = await request(app).get("/route");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: { code: "INTERNAL_ERROR", message: "Something went wrong." },
    });
    expect(consoleErrorSpy).toHaveBeenCalled(); // still logged server-side for debugging
    consoleErrorSpy.mockRestore();
  });
});
