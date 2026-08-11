import { describe, expect, it } from "vitest";
import { toggleId } from "./favorites";

describe("toggleId", () => {
  it("adds an id that isn't in the list", () => {
    expect(toggleId(["a", "b"], "c")).toEqual(["a", "b", "c"]);
  });

  it("removes an id that's already in the list", () => {
    expect(toggleId(["a", "b", "c"], "b")).toEqual(["a", "c"]);
  });

  it("adds to an empty list", () => {
    expect(toggleId([], "a")).toEqual(["a"]);
  });

  it("removes the only id, leaving an empty list", () => {
    expect(toggleId(["a"], "a")).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const input = ["a", "b"];
    toggleId(input, "c");
    expect(input).toEqual(["a", "b"]);
  });
});
