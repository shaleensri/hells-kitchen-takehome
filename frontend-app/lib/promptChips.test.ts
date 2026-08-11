import { describe, expect, it } from "vitest";
import { RECIPE_PROMPT_CHIPS } from "./promptChips";

describe("RECIPE_PROMPT_CHIPS", () => {
  it("every chip has a non-empty label and question", () => {
    for (const chip of RECIPE_PROMPT_CHIPS) {
      expect(chip.label.trim().length).toBeGreaterThan(0);
      expect(chip.question.trim().length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate labels", () => {
    const labels = RECIPE_PROMPT_CHIPS.map((c) => c.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("has no duplicate questions", () => {
    const questions = RECIPE_PROMPT_CHIPS.map((c) => c.question);
    expect(new Set(questions).size).toBe(questions.length);
  });

  it("every question fits within the backend's 500-character question cap", () => {
    for (const chip of RECIPE_PROMPT_CHIPS) {
      expect(chip.question.length).toBeLessThanOrEqual(500);
    }
  });
});
