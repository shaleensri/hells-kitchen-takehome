import { describe, expect, it } from "vitest";
import { FINDER_DISCOVERY_CHIPS } from "./finderChips";

describe("FINDER_DISCOVERY_CHIPS", () => {
  it("every chip has a non-empty label and query", () => {
    for (const chip of FINDER_DISCOVERY_CHIPS) {
      expect(chip.label.trim().length).toBeGreaterThan(0);
      expect(chip.query.trim().length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate labels", () => {
    const labels = FINDER_DISCOVERY_CHIPS.map((c) => c.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("every query fits within the backend's 500-character query cap", () => {
    for (const chip of FINDER_DISCOVERY_CHIPS) {
      expect(chip.query.length).toBeLessThanOrEqual(500);
    }
  });
});
