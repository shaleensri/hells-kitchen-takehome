import { describe, expect, it } from "vitest";
import { firstValue, splitList } from "./searchParams";

describe("firstValue", () => {
  it("passes a plain string through", () => {
    expect(firstValue("pizza")).toBe("pizza");
  });
  it("takes the first element of an array (repeated query key)", () => {
    expect(firstValue(["a", "b"])).toBe("a");
  });
  it("passes undefined through", () => {
    expect(firstValue(undefined)).toBeUndefined();
  });
});

describe("splitList", () => {
  it("splits a comma-separated string, trimming whitespace", () => {
    expect(splitList("italian, dinner ,pasta")).toEqual(["italian", "dinner", "pasta"]);
  });
  it("returns undefined for undefined/empty input", () => {
    expect(splitList(undefined)).toBeUndefined();
    expect(splitList("")).toBeUndefined();
  });
  it("returns undefined if every item is blank after trimming", () => {
    expect(splitList(" , , ")).toBeUndefined();
  });
});
