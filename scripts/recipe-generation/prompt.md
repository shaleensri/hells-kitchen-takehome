# Generation constraints (Iteration 10)

These are the constraints every batch was drafted against — the same rules
that would have gone into an actual LLM prompt if a separate scripted call
had been used (see `README.md` for why one wasn't). Recorded here regardless
so the process is reproducible/auditable, not just "trust me."

1. **Strict schema match.** Every recipe must match `RawRecipe`
   (`shared/src/types.ts`) exactly: `id`, `title`, `description`, `servings`,
   `prepTime`, `cookTime`, `difficulty`, `ingredients[]`, `instructions[]`,
   `tags[]`, `dateAdded`. Every ingredient line matches
   `RawRecipeIngredientLine`: `ingredientId`, `amount` (a numeric string),
   `unit`.
2. **Prefer existing ingredient IDs.** Reuse the 54 ingredients already in
   `data.json` wherever a recipe can be built from them realistically. Don't
   invent a new ingredient just for minor variety.
3. **Never invent an ingredient inline.** If a recipe genuinely needs one
   that doesn't exist, it gets a complete record (`id`, `name`, `category`,
   `dietary`, `nutrition`, `commonAllergens`) added to `data.json`'s
   `ingredients[]` — never a bare `ingredientId` with nothing backing it.
4. **Units must actually resolve.** Before finalizing any line, check it
   against the real `convertToGrams()` (`shared/src/units.ts`) — mass units
   (g/oz/lb) always work; volume units (cup/tbsp/tsp/ml) need the
   ingredient present in `INGREDIENT_GRAMS_PER_CUP`; count units (medium,
   cloves, whole, ...) need it in `COUNT_UNIT_REFERENCE_WEIGHTS` for that
   exact unit string. If a chosen unit doesn't resolve, either pick a unit
   that does or add the missing table entry deliberately (see
   `validation-notes.md` for where that happened and why).
5. **Verify nutrition numerically, don't estimate by eye.** Every batch was
   run through the real `convertToGrams()` + the same per-100g scaling
   `nutrition.ts` uses, before being merged into `data.json` — not hand-
   guessed calorie ranges.
6. **Don't overclaim derived dietary tags.** `dietary[]` isn't something a
   recipe declares — it's computed (`dietary.ts`) from the *intersection* of
   every ingredient's own `dietary[]`. A free-text tag like `gluten-free`
   was only kept if the real derivation (checked, not assumed) actually
   produces it for that recipe's exact ingredient list.
7. **Genuine variety, existing tag vocabulary.** Vary cuisine, technique,
   difficulty, and dietary coverage across a batch — avoid three near-
   identical bowls/skillets. Reuse the existing tag style (short, lowercase,
   e.g. `family`, `quick`, `dinner`) rather than inventing a parallel set of
   near-duplicate tags.
8. **No unresolved ingredient references.** Every `ingredientId` a recipe
   uses must exist in `data.json`'s `ingredients[]` — checked via the real
   `seedValidation.ts`, not assumed.
