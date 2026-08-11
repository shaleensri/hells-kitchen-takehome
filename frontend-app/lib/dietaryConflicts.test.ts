import { describe, expect, it } from "vitest";
import { getDietaryConflicts } from "./dietaryConflicts";

describe("getDietaryConflicts", () => {
  it("returns no conflicts when the recipe satisfies every saved restriction", () => {
    expect(getDietaryConflicts(["vegan"], ["vegan", "gluten-free"])).toEqual([]);
  });

  it("flags a restriction the recipe doesn't satisfy", () => {
    expect(getDietaryConflicts(["vegan"], ["vegetarian"])).toEqual(["vegan"]);
  });

  it("flags multiple unmet restrictions independently", () => {
    expect(getDietaryConflicts(["vegan", "keto"], ["vegetarian"])).toEqual(["vegan", "keto"]);
  });

  it("returns no conflicts when the profile has no saved restrictions", () => {
    expect(getDietaryConflicts([], ["vegan"])).toEqual([]);
  });

  it("flags everything when the recipe has no confirmed dietary tags at all", () => {
    expect(getDietaryConflicts(["vegan", "gluten-free"], [])).toEqual(["vegan", "gluten-free"]);
  });
});
