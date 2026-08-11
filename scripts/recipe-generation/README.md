# Recipe dataset expansion — provenance (Iteration 10, PLAN.md §3.21/§3.31)

This folder is documentation, not runtime code. Nothing here is imported by
`backend-app` or `frontend-app` — the app only ever reads
`backend-app/db/data.json`, loaded once at boot (§5.4). This folder exists so
the *origin* of the expanded dataset is traceable after the fact, instead of
new recipes just silently appearing in `data.json` with no record of how
they were produced or checked.

- **`prompt.md`** — the constraints used to draft each batch (schema, unit,
  ingredient-reuse rules).
- **`batch-N.generated.json`** — the drafted recipes for batch N, in the
  exact shape later merged into `data.json`'s `recipes` array (id, tags,
  ingredients, instructions, etc. — see `shared/src/types.ts`'s `RawRecipe`).
  This *is* the "generated" artifact — see "How generation actually
  happened," below, for what that means concretely here.
- **`validation-notes.md`** — what was actually checked for each batch, and
  how (automated vs. spot-check), stated plainly rather than implied.

## How generation actually happened

PLAN.md §3.21 originally framed this as "use the OpenAI integration already
built for Iteration 6 to generate recipes via an offline script." In
practice, the agent implementing this iteration (Claude, via Claude Code)
drafted the recipes directly against the real schema and the real
ingredient/unit-conversion tables, rather than round-tripping through a
separate scripted call to the OpenAI API. Reasoning: the agent doing the
work is itself an LLM, so a second LLM call added cost and an extra
validate-after-the-fact step without changing what "LLM-assisted, not a
real recipe API" means for the finished dataset — the recipes are still
synthetic, still offline, still checked into `data.json` exactly the same
way. This was an explicit, discussed decision (not a silent scope change),
recorded in PLAN.md's decision log.

## What did NOT change

- No live recipe API.
- No runtime LLM generation — the model runs once, offline, while authoring
  this batch; the deployed app never calls out for recipe data.
- No database — still one static `data.json`, loaded at boot.
- Backend data-layer architecture is untouched (`data.ts`, `nutrition.ts`,
  `dietary.ts`, `seedValidation.ts` — same code, more rows).
