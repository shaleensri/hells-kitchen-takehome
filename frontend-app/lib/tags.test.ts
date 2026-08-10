import { describe, expect, it } from "vitest";
import { dedupeTagsAgainstDietary } from "./tags";

describe("dedupeTagsAgainstDietary", () => {
  it("removes a raw tag that's also shown as a dietary badge (Margherita Pizza case)", () => {
    expect(dedupeTagsAgainstDietary(["italian", "vegetarian", "dinner"], ["vegetarian"])).toEqual([
      "italian",
      "dinner",
    ]);
  });

  it("is case-insensitive", () => {
    expect(dedupeTagsAgainstDietary(["Vegan"], ["vegan"])).toEqual([]);
  });

  it("keeps everything when there's no overlap", () => {
    expect(dedupeTagsAgainstDietary(["italian", "dinner"], ["vegan"])).toEqual(["italian", "dinner"]);
  });

  it("handles an empty dietary list", () => {
    expect(dedupeTagsAgainstDietary(["italian"], [])).toEqual(["italian"]);
  });
});
