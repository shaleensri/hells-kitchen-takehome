# Validation notes — Batch 1 (Iteration 10, PLAN.md §3.31)

Stated plainly, per the plan's own requirement: this batch was validated
with **automated checks plus targeted spot checks**, not hand-audited
line-by-line at the same depth as the original 15-recipe dataset's unit-
conversion work (§3.9). At 9 recipes this was still feasible to check
individually; see Batch 2's notes for whether that held at a larger count.

## What was checked, and how

1. **Every ingredient line resolves to grams** — not assumed, computed. Ran
   the real `convertToGrams()` (`shared/src/units.ts`) against every line in
   the draft before merging anything into `data.json`. Found one real gap:
   `peanut_butter` (an existing ingredient, id already in the ingredients
   table) had never been used with a resolvable unit in the original 15
   recipes, so it had no density entry in `INGREDIENT_GRAMS_PER_CUP`. Added
   one (`258` g/cup, a USDA-ish approximation like every other value in that
   table) rather than avoiding `tbsp` in favor of an awkward `oz` measurement
   — this is "extending coverage for an existing ingredient," not "adding a
   new ingredient," and is exactly the kind of update the plan anticipated.

2. **Nutrition computed via the real formula, not eyeballed.** Ran every
   recipe through the exact math `nutrition.ts` uses (`per100g × grams/100`,
   summed, divided by servings) before merging. After merging, independently
   re-verified via the *actual* app code path (`loadAppData`/
   `toRecipeDetail`, not a second reimplementation) — both runs produced
   identical numbers. Per-serving calories across the batch: 138-402 kcal,
   in the same band as the original 15 recipes (which range roughly
   180-550 kcal/serving). Nothing zero, nothing absurd.

3. **New permanent regression test** (`backend-app/src/dataExpansion.test.ts`)
   — goes through the real app path, not a fake parser, and asserts for
   every non-allowlisted recipe: zero unresolved ingredient lines, zero
   unmappable units, `nutrition.partial === false`, and per-serving calories
   in a sane range (>0, ≤1500 — a loose sanity net against a data-entry
   typo, not a precision claim). Proved this test actually catches a real
   problem before trusting it: temporarily corrupted one line's unit to a
   nonsense value, confirmed the test failed with a clear message, restored
   the fix, confirmed it passed again.

4. **Dietary tags checked against the real derivation, not assumed.** Ran
   the actual `dietary.ts` intersection logic against every new recipe's
   resolved ingredients before finalizing free-text `tags`. Found one real
   overclaim: "Greek Yogurt Tandoori Chicken" listed `gluten-free` in its
   tags, but `chicken_breast` isn't tagged `gluten-free` in the ingredient
   data (a pre-existing gap in the *original* dataset — the same pattern
   already exists on recipe 14, "Almond-Crusted Chicken," which has the
   identical issue). Rather than lean on that precedent, removed the
   unbacked tag from the new recipe. Did **not** touch the underlying
   `chicken_breast`/`ground_beef`/`shrimp`/`salmon_fillet` ingredient
   records to add `gluten-free` — that would be a real, arguably-correct
   fix, but it's a pre-existing data-quality question unrelated to *this*
   batch, and changing it risks silently changing the derived `dietary[]`
   for the original 15 recipes too. Noted here as a finding, not fixed —
   worth a deliberate look in a future pass if it matters.

5. **Manual spot check, all 9 (not a sample)** — at this batch size, checking
   every recipe by eye (title/ingredients/instructions read for realism,
   calories cross-referenced against the automated output) was still
   practical. Read through all 9; nothing looked like a hallucinated or
   nonsensical combination.

6. **No duplicate recipe ids, no duplicate ingredient ids** — asserted by
   `dataExpansion.test.ts`, not just assumed. New recipe ids continue the
   existing plain-numeric-string convention (`"16"`-`"24"`), matching the
   existing `"1"`-`"15"`.

7. **Live browser verification** (Playwright, against a locally running
   `npm start` instance of both apps, real HTTP requests — not just
   `npm test`): list page shows "24 of 24 entries," search finds a new
   recipe by name, the vegan filter includes the new vegan recipe and its
   count matches a direct API call, sort-by-calories still returns all 24,
   a new recipe's detail page renders all 6 ingredients and the exact
   correct calorie figure, an ingredient filter correctly finds both an
   *old* recipe (Sushi Roll) and a *new* one (Crab Cakes) sharing
   `crab_meat`, and the shopping list correctly merges an old + a new
   recipe together. Zero console errors. Screenshot taken and reviewed.

## Ingredients

**Zero new ingredients added.** All 9 recipes were built entirely from the
existing 54-ingredient table. One existing ingredient (`peanut_butter`)
gained a `shared/src/units.ts` density entry it didn't have before (see
point 1) — a real source-code change, called out explicitly per the plan's
own instruction to treat this as source-code work, not data entry.

## Counts after Batch 1

- Recipes: 15 → **24**
- Ingredients: 54 → **54** (unchanged)
- `shared/src/units.ts`: `INGREDIENT_GRAMS_PER_CUP` gained one entry
  (`peanut_butter`)
- Tests: 168 → **172** (2 existing hardcoded-15-recipe assertions updated to
  24, 1 new `dataExpansion.test.ts` file with 4 tests)

## What's still true after this batch

- No live recipe API.
- No runtime LLM generation — this batch was drafted once, offline, by the
  agent doing this iteration's implementation work (see
  `README.md`'s "How generation actually happened").
- No database — still one static `data.json`, loaded once at boot.
- Backend data-layer architecture untouched.
