import { describe, expect, it } from "vitest";
import { convertToGrams, parseAmount } from "./units";

describe("parseAmount", () => {
  it("parses plain decimal strings", () => {
    expect(parseAmount("2.5")).toBe(2.5);
    expect(parseAmount("10")).toBe(10);
  });

  it("parses simple fraction strings", () => {
    expect(parseAmount("1/3")).toBeCloseTo(0.3333, 3);
    expect(parseAmount("1/2")).toBe(0.5);
  });

  it("returns null for garbage input", () => {
    expect(parseAmount("a lot")).toBeNull();
    expect(parseAmount("")).toBeNull();
  });
});

describe("convertToGrams — mass tier", () => {
  it("converts g, oz, lb with no ingredient-specific data (§3.9 tier 1)", () => {
    expect(convertToGrams("crab_meat", "200", "g")).toEqual({
      grams: 200,
      approximate: false,
      tier: "mass",
    });
    const lb = convertToGrams("chicken_breast", "1", "lb");
    expect(lb.tier).toBe("mass");
    expect(lb.approximate).toBe(false);
    expect(lb.grams).toBeCloseTo(453.592, 2);
  });
});

describe("convertToGrams — volume tier", () => {
  it("uses the per-ingredient density, marks the result approximate", () => {
    // 2 cups flour: 2 * 125g/cup = 250g
    const result = convertToGrams("flour", "2.5", "cups");
    expect(result.tier).toBe("volume");
    expect(result.approximate).toBe(true);
    expect(result.grams).toBeCloseTo(312.5, 1);
  });

  it("gives the same density-derived answer regardless of which volume unit is used", () => {
    // olive_oil appears as both "cup" and "tbsp" in the seed data (§3.9) —
    // both must derive from the same gramsPerCup reference.
    const oneCup = convertToGrams("olive_oil", "1", "cup");
    const sixteenTbsp = convertToGrams("olive_oil", "16", "tbsp");
    expect(oneCup.grams).toBeCloseTo(sixteenTbsp.grams!, 5);
  });

  it("returns null (not a guess) when the ingredient has no density entry", () => {
    const result = convertToGrams("some_unmapped_ingredient", "1", "cup");
    expect(result.grams).toBeNull();
    expect(result.approximate).toBe(false);
  });
});

describe("convertToGrams — count tier", () => {
  it("uses the per-(ingredient, unit) reference weight, marks it approximate", () => {
    const result = convertToGrams("garlic", "6", "cloves");
    expect(result.tier).toBe("count");
    expect(result.approximate).toBe(true);
    expect(result.grams).toBe(18);
  });

  it("distinguishes size descriptors for the same ingredient (cucumber large vs medium)", () => {
    const large = convertToGrams("cucumber", "1", "large");
    const medium = convertToGrams("cucumber", "1", "medium");
    expect(large.grams).toBe(300);
    expect(medium.grams).toBe(200);
  });
});

describe("convertToGrams — unmapped combination", () => {
  it("returns grams: null rather than fabricating a number (§3.9 fallback contract)", () => {
    const result = convertToGrams("flour", "1", "smidgen");
    expect(result.grams).toBeNull();
    expect(result.approximate).toBe(false);
    expect(result.tier).toBe("unknown");
  });
});
