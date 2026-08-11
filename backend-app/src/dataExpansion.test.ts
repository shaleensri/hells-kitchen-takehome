/**
 * Data-resolution regression test — PLAN.md §3.31 (Iteration 10, Codex's
 * revised plan §6). `seedValidation.ts` only proves every `ingredientId` a
 * recipe references exists in the ingredients table; it says nothing about
 * whether that ingredient+unit combination actually resolves to a gram
 * figure via `convertToGrams()`. A recipe can pass seed-validation cleanly
 * and still render `partial`/estimated/unresolved in the UI — exactly the
 * failure mode Iteration 10 exists to avoid (PLAN.md §6: "otherwise new
 * recipes show up partial/unresolved and undercut the entire point of this
 * iteration").
 *
 * This test goes through the real app path (`loadAppData`/`toRecipeDetail`,
 * the same functions the actual API routes use) rather than a fake parser,
 * and asserts every recipe's ingredient lines fully resolve and its
 * nutrition isn't partial — with an explicit, named allowlist for any
 * *deliberately* unresolved/unmerged edge-case recipe a future batch might
 * add on purpose (PLAN.md §3.9's shopping-list unmerged path is real but,
 * as of Iteration 9/§3.29, untested against live data — a future batch may
 * add 1-2 intentional examples). Empty for now: every recipe added in
 * Batch 1 fully resolves.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_DATA_PATH, loadAppData, toRecipeDetail } from "./data";

/** Recipe ids allowed to have unresolved/partial ingredient lines on
 * purpose — see this file's header. Keep empty unless a future batch
 * deliberately adds an unmerged-shopping-list example, and if it does,
 * name the id here with a comment explaining which line and why. */
const INTENTIONALLY_PARTIAL_RECIPE_IDS = new Set<string>();

describe("expanded dataset — every recipe resolves through the real app path (§3.31)", () => {
  const appData = loadAppData(DEFAULT_DATA_PATH);

  it("has zero seed-validation issues (every ingredientId exists)", () => {
    expect(appData.seedValidationIssues).toEqual([]);
  });

  it("every non-allowlisted recipe has zero unresolved ingredient lines and non-partial nutrition", () => {
    const failures: string[] = [];

    for (const recipe of appData.recipes) {
      if (INTENTIONALLY_PARTIAL_RECIPE_IDS.has(recipe.raw.id)) continue;

      const detail = toRecipeDetail(recipe);

      for (const line of detail.ingredients) {
        if (!line.resolved) {
          failures.push(`${recipe.raw.id} "${recipe.raw.title}": unresolved ingredientId "${line.ingredientId}"`);
        } else if (line.grams === null) {
          failures.push(
            `${recipe.raw.id} "${recipe.raw.title}": "${line.amount} ${line.unit}" of ${line.name} doesn't resolve to grams (no conversion coverage for that unit)`
          );
        }
      }

      if (detail.nutrition.partial) {
        failures.push(`${recipe.raw.id} "${recipe.raw.title}": nutrition.partial is true`);
      }
    }

    expect(failures).toEqual([]);
  });

  it("every non-allowlisted recipe has plausible per-serving calories (not zero, not absurd)", () => {
    const implausible: string[] = [];

    for (const recipe of appData.recipes) {
      if (INTENTIONALLY_PARTIAL_RECIPE_IDS.has(recipe.raw.id)) continue;

      const detail = toRecipeDetail(recipe);
      const calories = detail.nutrition.perServing.calories;
      // Loose bounds deliberately — this isn't a precision check (§3.5's
      // basis assumption already says these numbers aren't lab-verified),
      // just a sanity net against a data-entry mistake (e.g. an amount typo
      // that's off by 10x) producing something obviously wrong.
      if (calories <= 0 || calories > 1500) {
        implausible.push(`${recipe.raw.id} "${recipe.raw.title}": ${calories} kcal/serving`);
      }
    }

    expect(implausible).toEqual([]);
  });

  it("no duplicate recipe ids or duplicate ingredient ids", () => {
    const recipeIds = appData.recipes.map((r) => r.raw.id);
    expect(new Set(recipeIds).size).toBe(recipeIds.length);

    const ingredientIds = [...appData.ingredientsById.keys()];
    expect(new Set(ingredientIds).size).toBe(ingredientIds.length);
  });
});
