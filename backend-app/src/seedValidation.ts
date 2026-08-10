/**
 * Seed-data validation — PLAN.md §3.4. Runs at server boot, checks every
 * recipe's ingredientIds resolve against the ingredients table, and WARNS
 * (never throws/crashes) on anything unresolved. The 8 ingredients that were
 * actually missing when this was written have been fixed directly in
 * data.json (§3.4 decision #1) — this validator is the permanent safety net
 * for any *future* bad data, not the fix for a known-good dataset.
 */
import type { RawData } from "@hells-kitchen/shared";

export interface SeedValidationIssue {
  recipeId: string;
  recipeTitle: string;
  ingredientId: string;
}

export function validateSeedData(data: RawData): SeedValidationIssue[] {
  const knownIngredientIds = new Set(data.ingredients.map((i) => i.id));
  const issues: SeedValidationIssue[] = [];

  for (const recipe of data.recipes) {
    for (const line of recipe.ingredients) {
      if (!knownIngredientIds.has(line.ingredientId)) {
        issues.push({
          recipeId: recipe.id,
          recipeTitle: recipe.title,
          ingredientId: line.ingredientId,
        });
      }
    }
  }

  return issues;
}

export function logSeedValidationIssues(issues: SeedValidationIssue[]): void {
  if (issues.length === 0) {
    console.log("[seed-validation] OK — every recipe ingredientId resolves.");
    return;
  }
  console.warn(
    `[seed-validation] WARNING: ${issues.length} unresolved ingredient reference(s) found. ` +
      "Affected recipes will show partial nutrition/resolution for these lines (§3.4)."
  );
  for (const issue of issues) {
    console.warn(
      `  - recipe "${issue.recipeTitle}" (${issue.recipeId}) references unknown ingredientId "${issue.ingredientId}"`
    );
  }
}
