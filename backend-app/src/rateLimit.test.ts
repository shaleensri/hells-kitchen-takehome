import { beforeEach, describe, expect, it } from "vitest";
import { isRateLimited, RATE_LIMIT_MAX_REQUESTS, resetRateLimiter } from "./rateLimit";

describe("isRateLimited", () => {
  beforeEach(() => {
    resetRateLimiter();
  });

  it("allows requests under the limit", () => {
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      expect(isRateLimited("client-a")).toBe(false);
    }
  });

  it("rejects once a single key exceeds the per-window limit", () => {
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      isRateLimited("client-a");
    }
    expect(isRateLimited("client-a")).toBe(true);
  });

  it("tracks keys independently — one client's usage doesn't affect another's", () => {
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      isRateLimited("client-a");
    }
    expect(isRateLimited("client-a")).toBe(true);
    expect(isRateLimited("client-b")).toBe(false);
  });

  it("resets once the window has elapsed", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      isRateLimited("client-a", t0);
    }
    expect(isRateLimited("client-a", t0)).toBe(true);
    // 61 seconds later — a new window.
    expect(isRateLimited("client-a", t0 + 61_000)).toBe(false);
  });
});
