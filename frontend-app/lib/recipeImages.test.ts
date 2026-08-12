import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { recipeImageSrc } from "./recipeImages";

// Reads the real seed data and the real public/ directory — not fixtures —
// on purpose: this is a regression test for a filesystem convention
// (recipeId -> public/images/recipes/{id}.jpg), and a fixture couldn't
// catch a genuinely missing or orphaned file the way the real thing can.
// Same "prove it against the real path, not a stand-in" instinct as
// dataExpansion.test.ts (backend-app) and seedValidation.test.ts.
const DATA_PATH = path.join(__dirname, "../../backend-app/db/data.json");
const IMAGES_DIR = path.join(__dirname, "../public/images/recipes");

function loadRecipeIds(): string[] {
  const raw = JSON.parse(fs.readFileSync(DATA_PATH, "utf8")) as { recipes: { id: string }[] };
  return raw.recipes.map((r) => r.id);
}

describe("recipeImageSrc", () => {
  it("builds the expected public/ path", () => {
    expect(recipeImageSrc("7")).toBe("/images/recipes/7.jpg");
  });
});

describe("recipe image files (PLAN.md §3.35)", () => {
  it("has a real image file for every recipe in the current dataset", () => {
    const ids = loadRecipeIds();
    expect(ids.length).toBeGreaterThan(0); // guards against a silently-empty dataset making this test vacuous
    const missing = ids.filter((id) => !fs.existsSync(path.join(IMAGES_DIR, `${id}.jpg`)));
    expect(missing).toEqual([]);
  });

  it("has no orphaned image files left over from a removed/renumbered recipe", () => {
    const validIds = new Set(loadRecipeIds());
    const files = fs.readdirSync(IMAGES_DIR).filter((f) => f.endsWith(".jpg"));
    const orphaned = files.filter((f) => !validIds.has(f.replace(/\.jpg$/, "")));
    expect(orphaned).toEqual([]);
  });

  it("every image file is a non-trivial size (catches a truncated/corrupt download, not just a missing one)", () => {
    const ids = loadRecipeIds();
    const tooSmall = ids.filter((id) => {
      const p = path.join(IMAGES_DIR, `${id}.jpg`);
      return !fs.existsSync(p) || fs.statSync(p).size < 5_000;
    });
    expect(tooSmall).toEqual([]);
  });
});
