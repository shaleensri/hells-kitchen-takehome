import { describe, expect, it } from "vitest";
import { hrefWithParam, hrefWithToggledListValue, isListValueActive, paramValue } from "./filterUrl";

describe("hrefWithToggledListValue", () => {
  it("adds a value to an empty list", () => {
    expect(hrefWithToggledListValue({}, "dietary", "vegan")).toBe("/recipes?dietary=vegan");
  });

  it("adds a value alongside an existing one", () => {
    expect(hrefWithToggledListValue({ dietary: "vegan" }, "dietary", "gluten-free")).toBe(
      "/recipes?dietary=vegan%2Cgluten-free"
    );
  });

  it("removes a value that's already active (toggle off)", () => {
    expect(hrefWithToggledListValue({ dietary: "vegan,gluten-free" }, "dietary", "vegan")).toBe(
      "/recipes?dietary=gluten-free"
    );
  });

  it("drops the param entirely when the last value is toggled off", () => {
    expect(hrefWithToggledListValue({ dietary: "vegan" }, "dietary", "vegan")).toBe("/recipes");
  });

  it("preserves other params untouched", () => {
    const href = hrefWithToggledListValue({ q: "curry", tags: "indian" }, "dietary", "vegan");
    const url = new URL(href, "http://x");
    expect(url.searchParams.get("q")).toBe("curry");
    expect(url.searchParams.get("tags")).toBe("indian");
    expect(url.searchParams.get("dietary")).toBe("vegan");
  });

  it("is case-insensitive when matching for toggle-off", () => {
    expect(hrefWithToggledListValue({ dietary: "Vegan" }, "dietary", "vegan")).toBe("/recipes");
  });
});

describe("isListValueActive", () => {
  it("detects an active value case-insensitively", () => {
    expect(isListValueActive({ dietary: "Vegan,keto" }, "dietary", "vegan")).toBe(true);
    expect(isListValueActive({ dietary: "keto" }, "dietary", "vegan")).toBe(false);
  });

  it("returns false when the key is absent", () => {
    expect(isListValueActive({}, "dietary", "vegan")).toBe(false);
  });
});

describe("hrefWithParam", () => {
  it("sets a param", () => {
    expect(hrefWithParam({}, "difficulty", "hard")).toBe("/recipes?difficulty=hard");
  });

  it("toggles off when setting the already-active value (real toggle, not one-way)", () => {
    expect(hrefWithParam({ difficulty: "hard" }, "difficulty", "hard")).toBe("/recipes");
  });

  it("clears when value is undefined", () => {
    expect(hrefWithParam({ difficulty: "hard" }, "difficulty", undefined)).toBe("/recipes");
  });

  it("preserves other params", () => {
    const href = hrefWithParam({ q: "curry" }, "difficulty", "hard");
    const url = new URL(href, "http://x");
    expect(url.searchParams.get("q")).toBe("curry");
    expect(url.searchParams.get("difficulty")).toBe("hard");
  });
});

describe("paramValue", () => {
  it("reads a single value", () => {
    expect(paramValue({ difficulty: "hard" }, "difficulty")).toBe("hard");
  });
  it("returns undefined when absent", () => {
    expect(paramValue({}, "difficulty")).toBeUndefined();
  });
});
