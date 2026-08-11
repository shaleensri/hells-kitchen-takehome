# Recipe Manager — Project Plan & Decision Log

**Status as of 2026-08-10:** Planning complete, plan externally reviewed (Codex, 3 rounds). **Iterations 1-3 complete** (§6) — full backend (§3.14-§3.16) plus the frontend core (§3.17). **Checkpoint 1 (§3.12) reached** after Iteration 3. Since then, two design passes: §3.19's warm/serif direction was superseded entirely by **§3.20 — a full redesign matching a user-supplied UI mockup**, an "engineering spec sheet" aesthetic (Barlow Condensed, steel-blue accent, corner-bracket cards, sharp edges, dotted rules). That pass also pulled forward real functionality: a **working recipe-scaling servings stepper** (Iteration 4 feature, verified with exact math), fully wired dietary/tag/difficulty/ingredient filters with live counts, and a new backend `difficulty` filter param. **100 passing tests**, typecheck/build clean, verified via Playwright across light/dark × desktop/tablet/mobile with zero console errors, plus genuinely-triggered (not just code-reviewed) loading and 404 states. `npm run dev` in both `backend-app` and `frontend-app`, then `localhost:3000/recipes` (or whatever port Next.js falls back to if 3000 is taken).

This file is the single source of truth for *why* the project is being built the way it is, not just *what* to build. If you are a new agent (or a human) picking this up cold, read this whole file before touching code — it captures decisions already made and the reasoning behind them, so you don't re-litigate settled questions or repeat analysis already done.

---

## Project summary

**Recipe Manager** is a full-stack web app for browsing, searching, and organizing recipes. Backend is Express/TypeScript (Iteration 1) serving a mock JSON "database" (`backend-app/db/data.json`) of recipes and ingredients; frontend is Next.js/TypeScript, App Router (Iteration 3). Users can browse a recipe list with search/tag/ingredient filters, view a recipe detail page with joined ingredient quantities, instructions, tags, and computed nutrition (calculated server-side from per-ingredient nutrition + a shared unit-conversion module) — this core loop is live and working end to end as of Iteration 3. On top of that core, the build adds: derived dietary filters (vegan/vegetarian/gluten-free/etc., computed from ingredient data rather than hand-tagged), sorting, live recipe scaling by servings, a shopping-list generator that merges ingredients across selected recipes, localStorage-based favoriting and a persistent dietary/interest profile (no accounts — see §3.1), and an "Ask about this recipe" panel backed by a server-side OpenAI proxy that's grounded in the specific recipe's ingredients/instructions. The whole thing is meant to be deployed live (Vercel + Render/Railway), not just run locally.

See §1 below for the framing this is built under (it's a take-home assessment), and §3 for the full reasoning behind each of these choices.

---

## 1. What this actually is

This is a **take-home coding assessment**, not a real product. Source of truth for requirements: [`README.md`](README.md) at repo root. Do not add requirements the README/candidate doesn't ask for (e.g. real auth) without checking §4 below — over-building unrequested infrastructure reads as poor judgment to reviewers, not initiative.

- **Employer contacts for submission:** scott.nguyen@sprx.tax, anthony.difalco@sprx.tax
- **Submission format:** zip of the whole project + a link to a deployed live version (explicitly called out as bonus points) + a `## Candidate Notes` section appended to `README.md`.
- **Candidate's goal:** not just "meet requirements" but stand out in the interview. Plan was co-developed across two AI planning sessions (Gemini, then Claude) before any code was written — see §3 for the decision trail.
- **Time budget:** candidate confirmed **~3-5 days**. This is comfortable for the full scope in §4 (core + all 5 chosen bonus features + the above-and-beyond list + deploy) at good polish. See §7 for what to cut first if time runs short anyway.

---

## 2. Repo state as found (pre-Iteration-1 baseline — kept for history, see §2.1 for current state)

```
hells-kitchen/
├── README.md                  # assessment brief; setup-instructions typos fixed per §3.8 (folder names, backtick), Candidate Notes section still to be added in Iteration 8
├── backend-app/
│   ├── package.json           # plain JS, deps: express, cors, dotenv, nodemon
│   ├── db/data.json           # mock DB — recipes[] and ingredients[]
│   └── src/server.js          # ~30 lines: one route, GET /api/recipes, returns all recipes raw
└── frontend-app/
    ├── package.json           # Next.js 15.1.6 (App Router), React 19, plain JS (no TS configured)
    ├── jsconfig.json          # @/* path alias only
    └── app/page.js            # literally `<div>Hello World</div>`
```

Key facts:
- Backend runs on port **8080** (`npm run dev` → nodemon), frontend on **3000** (`npm run dev` → `next dev --turbopack`).
- **No TypeScript configured anywhere yet**, despite the plan requiring shared TS types (§4, §5.1). This needs to be set up in Iteration 1 — it's not already there.
- **Git repo already exists and is set up correctly** — verified via `git status`/`git remote -v`/`git log` at the project root (`hells-kitchen/hells-kitchen`, where README/backend-app/frontend-app live): on branch `main`, tracking `origin/main` at `https://github.com/shaleensri/hells-kitchen-takehome.git`, 2 commits so far (`initial skeleton`, `rename folders`). **`PLAN.md` itself is currently untracked** — `git add`/commit it along with the rest of Iteration 0's output. (Note: an earlier draft of this file wrongly claimed no git repo existed — that was checked against the wrong directory level. Corrected here after Codex's review caught it; see §3.8.)
- The existing `server.js` route is a placeholder — returns the raw recipe array with no filtering, no ingredient joins, no nutrition calc, and **re-reads + re-parses `data.json` from disk on every single request** (verified in the source — `getData()` is called inside the route handler, not cached). Effectively nothing to preserve; it'll be replaced wholesale in Iteration 2, and the "load once at boot" behavior described in §5.4 is a planned improvement, not something already in place.

### 2.1 Repo state after Iteration 3 (current)

```
hells-kitchen/
├── package.json               # root, npm workspaces: shared, backend-app, frontend-app
├── vitest.config.ts           # single test runner for the whole workspace (§3.14)
├── README.md
├── PLAN.md
├── shared/                    # @hells-kitchen/shared, source-only (no build step, §5.1/§3.14)
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── types.ts           # Recipe/Ingredient/API response shapes (§3.10)
│       ├── units.ts           # the 3-tier conversion module + its test (§3.9) — all 24 density + 21 count values populated
│       ├── units.test.ts
│       ├── duration.ts        # "20 minutes" → 20, for sorting (§4.2 item 2)
│       └── index.ts
├── backend-app/
│   ├── package.json           # TS; dev/start both run under tsx, no dist/ build step (§3.14)
│   ├── tsconfig.json
│   ├── db/data.json           # 8 missing ingredients added (§3.4), 54 ingredients / 15 recipes, zero seed-validation issues
│   └── src/
│       ├── server.ts          # NOW SLIM (Iteration 2) — boots data, calls createApp(), listens. Route wiring moved to app.ts.
│       ├── app.ts             # NEW — Express app factory (routes + error middleware), separate from server.ts so tests can hit it via supertest without a real port
│       ├── app.test.ts        # NEW — HTTP-level integration tests, full §3.10 contract against the real app + real data.json
│       ├── errors.ts          # ApiError/BadRequestError/NotFoundError + the { error: { code, message } } envelope middleware
│       ├── errors.test.ts     # incl. the 500/INTERNAL_ERROR fallback path, added on §3.16's review
│       ├── filtering.ts       # NEW — query parsing + filter (q/tags/ingredients/dietary) + sort, pure functions + its test
│       ├── filtering.test.ts
│       ├── routes/
│       │   ├── recipes.ts     # NEW — GET /api/recipes, GET /api/recipes/:id
│       │   └── ingredients.ts # NEW — GET /api/ingredients
│       ├── data.ts            # boot-time load + precompute (dietary[], nutrition) + its test
│       ├── data.test.ts
│       ├── nutrition.ts       # basis assumption resolved (per-100g), partial/approximate contract + its test
│       ├── nutrition.test.ts
│       ├── dietary.ts         # §3.2 vegan⊇vegetarian normalization + its test
│       ├── dietary.test.ts
│       ├── seedValidation.ts  # warns, doesn't crash + its test
│       └── seedValidation.test.ts
└── frontend-app/
    ├── package.json           # TS; next@15.5.23 (bumped from 15.1.6, §3.17); test script added
    ├── tsconfig.json          # jsconfig.json removed, superseded by this
    ├── next.config.mjs        # transpilePackages: ["@hells-kitchen/shared"] (§5.1)
    ├── .env.example           # documents NEXT_PUBLIC_API_URL for Iteration 8's deploy
    ├── lib/
    │   ├── api.ts             # typed client over the §3.10 contract, ApiRequestError + its test
    │   ├── api.test.ts
    │   ├── searchParams.ts    # raw Next.js searchParams → API client params + its test
    │   ├── searchParams.test.ts
    │   ├── tags.ts             # dedupes a raw tag against a dietary badge showing the same word (§3.17 bugfix) + its test
    │   └── tags.test.ts
    └── app/
        ├── layout.tsx          # site header/nav
        ├── page.tsx            # redirects to /recipes
        ├── not-found.tsx       # global 404 (unmatched routes)
        ├── globals.css         # design tokens (light/dark), extended from the create-next-app default
        └── recipes/
            ├── page.tsx        # list: server component, fetches via searchParams, renders FilterBar + grid
            ├── loading.tsx     # skeleton grid (Next Suspense convention)
            ├── error.tsx       # retry button, client component (Next error-boundary requirement)
            ├── _components/
            │   ├── FilterBar.tsx    # plain <form method="GET"> — no client JS needed (§3.17)
            │   └── RecipeCard.tsx
            └── [id]/
                ├── page.tsx        # detail: ingredients w/ resolved/approximate badges, instructions, nutrition table
                ├── loading.tsx
                ├── error.tsx
                └── not-found.tsx   # route-specific 404, triggered by notFound() on a backend 404
```

**82/82 tests passing** (`npm test` from root or any workspace): 64 backend + 18 frontend (`api.test.ts`, `searchParams.test.ts`, `tags.test.ts`). Beyond the automated suite: a real headless-Chromium Playwright pass against the actually-running app produced screenshots that caught 3 visual bugs invisible to typecheck/tests alone (§3.17) — all fixed and re-verified. `npm run dev` in both `backend-app` and `frontend-app` now serves a real, working website at `localhost:3000/recipes`. Full detail: §3.14 (Iteration 1's architecture snag), §3.15-§3.16 (backend review passes), §3.17 (Iteration 3's build + the visual-verification bugs).

---

## 3. Decision log (chronological — how we got here)

Each entry is a decision that was explicitly discussed and closed. Don't reopen these without a reason; if you find a reason, add a new dated entry rather than editing history.

### 3.1 — No full user auth; lightweight localStorage profile instead
**Decision:** No signup/login/sessions/password hashing. Instead, a "your preferences" panel (dietary restrictions/interests) saved to `localStorage`, same mechanism as favoriting.
**Why:** README never asks for accounts. Building real auth on a recipe take-home eats significant time on something not being evaluated, and can read as scope-mismatch/over-engineering rather than initiative. The localStorage profile gets the same "wow, it remembers my restrictions" payoff at a fraction of the cost.
**Behavior it must have:**
- Set once, auto-applies as the **default filter state** on `/recipes` every visit (not just a one-time filter action).
- The LLM panel (§3.3) reads this profile too, so it can proactively flag conflicts / suggest substitutions without the user having to ask.
- Document explicitly in Candidate Notes as a conscious scope decision, not an oversight.
**Stretch, only if time remains after everything else:** real lightweight auth (email/password or magic link) with server-stored profiles replacing localStorage, protecting favorites/profile behind login. This is **Iteration 9**, genuinely optional — do not plan around reaching it.

### 3.2 — Dietary filters must be *derived*, not manually tagged, and need normalization
**Decision:** A recipe's dietary compatibility (vegan/vegetarian/gluten-free/keto/etc.) is computed by intersecting the `dietary[]` arrays of every ingredient in that recipe — a recipe is "vegan" only if *every* ingredient is vegan.
**Critical correction found during planning (do not skip this when implementing Iteration 4):** A literal set-intersection is wrong against this seed data. Ingredients are tagged with either `"vegan"` **or** `"vegetarian"`, never both, even though vegan implies vegetarian in reality. Concrete proof from `data.json`: recipe `1` (Margherita Pizza) is manually tagged `"vegetarian"` in the seed data, but its ingredients are `tomato:[vegan,gluten-free]`, `mozzarella:[vegetarian]`, `flour:[vegan]`, `olive_oil:[vegan,gluten-free]`. A naive "every ingredient has `vegetarian` in its array" check would call this recipe **not vegetarian**, directly contradicting the seed data's own tag.
**Required fix:** before intersecting, apply a compatibility/equivalence rule — at minimum, treat `vegan` as satisfying a `vegetarian` requirement (vegan ⊇ vegetarian). Build this explicitly as a small rule table in Iteration 4, don't let it get implicit/forgotten inside a generic filter function.

### 3.3 — LLM feature: OpenAI, not Anthropic
**Decision:** Use OpenAI's API (candidate already has funded credits there), not Anthropic, despite earlier planning drafts assuming Claude.
**Architecture unchanged regardless of provider:** backend proxy endpoint holds the API key server-side (`.env`, never shipped to the browser). Frontend panel — "Ask about this recipe" on `/recipes/[id]` — sends a user question to the backend; backend grounds the prompt in that recipe's actual ingredients/instructions (not a generic chatbot) and returns the answer.
**Model choice:** use a cheap/fast model (e.g. `gpt-4o-mini` or equivalent at build time) — a grounded single-recipe Q&A panel doesn't need frontier reasoning, and it keeps spend/latency low for a live demo.
**Resilience requirement:** if `OPENAI_API_KEY` isn't set on whatever host the backend deploys to, the feature must fail soft (disabled state with a clear message), not 500 the whole app. A live demo link must never break just because an env var didn't get wired.
**Enhancement once §3.1's profile exists:** pass the saved dietary profile into the prompt so the panel can proactively flag conflicts, e.g. "This contains dairy — you've marked yourself dairy-free. Try oat milk instead of whole milk."

### 3.4 — Seed data has real integrity holes; fix them *and* keep a validator
**Finding:** Cross-checked every `ingredientId` referenced by a recipe against the `ingredients` array in `data.json`. **8 ingredient IDs are referenced by recipes but have no ingredient record at all:** `basil`, `broccoli`, `carrot`, `ginger`, `soy_sauce`, `brown_sugar`, `butter`, `white_sugar`. That's roughly 20% of recipes touching at least one undefined ingredient (e.g. recipe `1` Margherita Pizza references `basil`; recipe `3` Chicken Stir-Fry references `broccoli`, `carrot`, `soy_sauce`, `ginger`; recipe `2` Chocolate Chip Cookies references `butter`, `brown_sugar`, `white_sugar`).
**Decision — do both:**
1. **Fix the data**: add real (simple, reasonable USDA-ish) ingredient records for all 8 missing IDs directly into `data.json`. This is ~10 minutes of work and means the live demo doesn't visibly show incomplete nutrition for 1-in-5 recipes in front of an interviewer.
2. **Keep a seed-validation script** that runs on server boot, checks every recipe's `ingredientId`s resolve against the ingredients list, and **logs a warning** (does not crash) for anything unresolved. This is explicit above-and-beyond scope from the original bonus list, and it's not just decorative — it caught the exact bug in (1). Keep it as the permanent safety net for any *future* bad data, even after (1) fixes the current gap.
**Downstream contract this implies (settle in Iteration 1, not later):** the recipe-detail API and nutrition-calc module must tolerate an unresolved ingredient gracefully rather than crash. Suggested response shape: an unresolved ingredient line includes `resolved: false` with a null/partial nutrition contribution, and the recipe's aggregate computed-nutrition object carries a `partial: true` flag if any ingredient in it was unresolved. Decide this shape before Iteration 3 (frontend) starts consuming it, so the frontend isn't reverse-engineering an ad hoc shape later. (Should be moot after the (1) fix ships, but the contract still needs to exist for defensive correctness.)

### 3.5 — Nutrition basis is inconsistent in the seed data — RESOLVED in Iteration 1 (§3.14), leaning below is what shipped
**Finding:** Spot-checked several ingredient nutrition entries in `data.json` against real-world per-100g values:

| Ingredient | Listed calories | Real-world per-100g | What it actually matches |
|---|---|---|---|
| `olive_oil` | 120 | ~884 | ~1 tbsp (~119 cal) |
| `flour` | 455 | ~364 | ~1 cup (~455 cal) |
| `chicken_breast` | 165 | ~165 | per-100g (matches) |

There is no single consistent basis across entries — looks like it was sourced from different reference units per ingredient (some per-tbsp, some per-cup, some genuinely per-100g). This was originally deferred by the candidate ("leave it as is for now, tackle later") but had to be resolved once Iteration 1 actually built the nutrition module — a module can't compute anything without picking a basis.
**Resolved as:** don't chase real-world nutritional accuracy against inconsistent source data. Treat each ingredient's listed nutrition value as its per-100g figure, scaled through the shared unit-conversion module (§5.1) — implemented exactly this way in `backend-app/src/nutrition.ts`, with the assumption documented inline at the top of that file. Internal consistency (same math applied everywhere) matters more here than matching real nutrition science, since the underlying seed data doesn't support real accuracy anyway. State this explicitly in Candidate Notes (Iteration 8) too — it's the kind of assumption a reviewer should hear from the candidate, not discover by reading source.

### 3.6 — Deploy is a protected priority, not a generic "cuttable bonus"
**Decision:** if time gets tight, cut a bonus feature (e.g. favoriting) before cutting the deploy step. Target **Vercel** for the frontend, **Render or Railway** for the backend, env vars wired between them.
**Why:** the README explicitly calls out a live deployed link as bonus points by name — it's not an arbitrary above-and-beyond idea, it's a named evaluation input. A working deploy also de-risks the whole submission (the reviewer doesn't have to trust `npm install` works on their machine).

### 3.7 — Scope/tiering philosophy under the confirmed 3-5 day budget
**Decision:** given the confirmed budget, build the **full plan** in §4/§7 at good polish — core + all 5 bonus features + the full above-and-beyond list + deploy + Candidate Notes. Do not preemptively cut anything on time-budget grounds. If something does need to be cut mid-build, use the priority order in §7 (deploy and core stay protected; Iteration 9 real accounts was never in scope for this budget to begin with).
**Amended by 3.12** — an explicit MVP checkpoint was added to the iteration flow as insurance under this philosophy, not a reversal of it.

### 3.8 — External review (Codex) caught a factual error in this plan and stale README setup instructions
**What happened:** the candidate had Codex review this plan and `README.md`. It correctly flagged that §2's original claim of "no git repository initialized" was wrong (the project root already has a git repo, on `main`, tracking `origin/main` — verified and corrected in §2) and that §5.4 wrongly described "load once at boot" as the *current* behavior of `server.js` when the placeholder actually re-reads the file per request (also corrected in §2/§5.4). It also flagged that `README.md` still says `cd backend` / `cd frontend` instead of the real folder names `backend-app`/`frontend-app`, and has a malformed backtick around "Candidate Notes" in the submission instructions.
**Decision:** both README issues were fixed directly (trivial, and leaving stale setup instructions in a submitted take-home is a bad look regardless of who introduced them). Lesson applied going forward: verify environment/tooling claims (git status, file behavior) by actually checking, not by inference from higher-level context — this file lost some credibility on exactly that kind of unverified claim once, don't repeat it.
**Verdict on the rest of Codex's review:** substantive and largely adopted — see 3.9–3.12 below.

### 3.9 — Nutrition and shopping-list unit handling need ingredient-specific reference data almost everywhere — a generic table barely covers anything
**Correction to §3.5/§4.1/§4.2, further corrected here (second review pass caught a second, deeper version of the same mistake):** the first pass of this section already established that count/descriptive units (medium, cloves, whole, etc.) need per-ingredient reference weights. What it got wrong was calling **volume units** (`cup`, `cups`, `tbsp`, `tsp`, `ml`) "generically convertible via a standard table" alongside pure mass units (`g`, `oz`, `lb`). That's not correct: volume units convert to *each other* via fixed, universal ratios (1 cup = 16 tbsp = 48 tsp ≈ 236.6 ml — genuinely ingredient-independent), but converting a **volume to a mass** (grams — which is what the nutrition-per-100g math and unit-aware shopping-list merging both actually need) requires an ingredient-specific density/reference-weight, exactly like the count units do. "2 cups flour," "2 tbsp olive oil," and "400 ml coconut milk" cannot be turned into grams from a generic table — flour, olive oil, and coconut milk have different densities, and the table has no way to know that.

**Recomputed, accurate breakdown (counted directly from `data.json`, not estimated):** the 15 recipes contain **71 total ingredient lines**, which collapse to **56 distinct (ingredientId, unit) pairs** — that's the number that matters for sizing the lookup table, since the same pair (e.g. `spaghetti`+`lb`) repeats across multiple recipes and only needs one table entry. Those 56 pairs split as:
- **Truly generic, zero ingredient-specific data needed (mass units only — `g`, `lb`, and `oz` used as a dry-weight unit):** **10 pairs** — `crab_meat`, `feta_cheese`, `pancetta` (g), `chicken_breast`, `ground_beef`, `salmon_fillet`, `shrimp`, `spaghetti` (lb), `mozzarella`, `tofu` (oz). This is the *minority* case, not the majority as the first pass implied.
- **Volume units needing a per-ingredient density/reference weight:** `cup`, `cups`, `tbsp`, `tsp`, `ml` — **25 (ingredientId, unit) pairs across 24 distinct ingredients** (one ingredient, `olive_oil`, appears under both `cup` and `tbsp` in different recipes — same ingredient, one reference number, reused for both, which is exactly why the lookup is keyed per-ingredient not per-pair for this category). The 24 ingredients: `almonds, brown_sugar, butter, cilantro, granola, greek_yogurt, olive_oil, parmesan, quinoa, white_sugar` (cup), `broccoli, chocolate_chips, flour, kale, mixed_berries, sushi_rice, tomato` (cups), `curry_powder, ginger, honey, soy_sauce, tahini` (tbsp, plus `olive_oil` again), `black_pepper` (tsp), `coconut_milk` (ml).
- **Count/descriptive units needing a per-(ingredient, unit) reference weight (unchanged from the first pass):** `bunch, can, cloves, head, large, leaves, medium, pieces, sheets, small, whole` — **21 pairs**, table below.

(10 + 25 + 21 = 56 — matches the total distinct pairs above.)

| Unit | Ingredient(s) using it |
|---|---|
| `bunch` | asparagus |
| `can` | chickpeas |
| `cloves` | garlic |
| `head` | cauliflower |
| `large` | cucumber, eggs, sweet_potato |
| `leaves` | basil |
| `medium` | banana, bell_pepper, carrot, cucumber, onion, potato, tomato |
| `pieces` | corn_tortillas |
| `sheets` | nori |
| `small` | red_onion |
| `whole` | avocado, lemon, lime |

**Decision:**
1. **Volume→mass:** add a single `gramsPerCup` (or equivalent) reference number per ingredient that appears in a volume unit — sourced once per ingredient, not once per unit. Any other volume unit (`tbsp`, `tsp`, `ml`) for that same ingredient is then derived through the universal, ingredient-independent volume-ratio conversion (cup↔tbsp↔tsp↔ml) combined with that one density number. This keeps the lookup small (24 numbers, not 24×4) and internally consistent — a `cup` and a `tbsp` usage of the same ingredient can't disagree with each other, because they both derive from the same source number.
2. **Count→mass:** unchanged from the first pass — a small, explicit **ingredient-specific reference-weight lookup** (e.g. `{ garlic: { clove: 3 }, onion: { medium: 110 }, red_onion: { small: 70 }, cucumber: { large: 300 }, basil: { leaves: 0.5 }, cauliflower: { head: 600 }, lemon: { whole: 58 }, ... }` — every key/unit pair here is one of the actual 21, not illustrative filler) covering exactly the 21 pairs above. Bounded and enumerable across only 15 recipes.
3. **Both lookups live in the shared unit-conversion module (§5.1)**, alongside the small universal mass-mass and volume-volume conversion tables — reused by both the nutrition module (Iteration 1) and shopping-list merging (Iteration 5), same "one system, two problems" principle already in §4.3.
4. **Fallback behavior differs by feature — this was wrong in the first pass, which applied one "omit" rule to both:**
   - **Nutrition (unchanged from the first pass' resolution):** for any ingredient whose unit can't be resolved to grams (no density/reference-weight entry, and not a mass unit), **omit that ingredient's numeric contribution** from the computed nutrition total and set the aggregate's `partial: true`. A line item that *was* resolved via a density or count reference weight gets `approximate: true` (it's a real number, but an estimate) — same three-case contract as before (§3.4 unresolved ingredient / this section's unmapped unit / estimated-weight line), still consistent.
   - **Shopping list — corrected, this is the actual bug the first pass had:** an unmapped/unconvertible unit must **never cause an ingredient to disappear from the list**. If a quantity can't be merged with other quantities of the same `ingredientId` (either because the unit has no reference data, or because merging would require a conversion we don't support), it stays on the list as its own **unmerged line item, in its original amount and unit, clearly attributed** (rather than being dropped or silently folded into a `partial` flag that has no visible UI representation). Losing an ingredient off a shopping list is a real functional failure — the user goes to the store and doesn't buy it — so "preserve the line, just don't merge it" is the only acceptable fallback there, unlike nutrition math where an omitted number is a reasonable degradation.
5. **Also corrects §4.2 item 4 (shopping list) merge rule:** merge **by `ingredientId`, not display name** (stable key, avoids string-matching bugs); only merge quantities that are in the same unit, or in units both resolvable to a common one (mass-mass, volume-volume-then-density, or a shared count-unit reference). Everything else lists as separate unmerged lines per (4) above.

### 3.10 — API contracts locked in now, before Iteration 2 starts
**Correction:** the original plan left query-param semantics implicit, to be figured out "while building." Codex correctly flagged this as something that should be decided before the frontend starts depending on it. Locking in concrete defaults now:
- **Search:** query param `q`, case-insensitive substring match against recipe `title` (and `description` as a secondary match).
- **Tag filter:** query param `tags`, comma-separated, **AND semantics** (recipe must have *all* selected tags) — tags are a refinement/narrowing control, consistent with typical faceted search UIs.
- **Ingredient filter:** query param `ingredients`, comma-separated (names or IDs), **ANY semantics** (recipe must contain *at least one* of the selected ingredients) — this is a browsing/discovery filter ("show me recipes with garlic or basil"), not a pantry-match tool. State this choice in the UI copy since it's a genuine judgment call, not an obvious default.
- **Dietary filter (resolves a real gap Codex caught — §3.2's dietary derivation had no query param or response field defined):** query param `dietary`, comma-separated (e.g. `vegan,gluten-free`), **AND semantics** (recipe must satisfy *all* selected dietary requirements) — same reasoning as the tags filter. This is **server-side filtering** against a `dietary: string[]` field that's *precomputed once per recipe at boot* (§3.2's normalized intersection, computed alongside the other boot-time derivations in §5.4) and exposed on both list and detail responses — not recomputed per request, and not left to the frontend to derive from raw ingredient data.
- **Difficulty filter (added in §3.20 for the design-pass filter rail):** query param `difficulty`, single value, **exact match** against `easy`/`medium`/`hard` — distinct from `sort=difficulty` (which orders by a fixed rank, doesn't filter). Lenient like the other filters: an unrecognized value matches nothing, not a 400.
- **List response shape:** lightweight fields — `id, title, description, prepTime, cookTime, difficulty, servings, tags, dietary`, **plus a lightweight nutrition summary**: `caloriesPerServing: number | null` and `nutritionPartial: boolean`. Both `dietary` and `caloriesPerServing` are cheap to include because they're precomputed once at boot (§5.4), not calculated per list request. No full ingredient list, instructions, or full macro breakdown in the list payload — keep it light for a grid of 15+ recipes.
  - **Resolves the sorting contradiction Codex flagged:** Iteration 4 requires calorie sorting on `/recipes`, which is impossible if the list response has no nutrition data at all. Adding `caloriesPerServing` to the list item (base-servings value, not scaled — scaling only applies on the detail page, §4.2 item 3) closes that gap without requiring the frontend to fetch every recipe's full detail just to sort.
  - **Sort param:** `sort` = `prepTime | cookTime | difficulty | calories`, optional `order` = `asc | desc` (default `asc`). `difficulty` sorts on a fixed `easy < medium < hard` ordering, not alphabetical.
- **Detail response shape:** full recipe object + resolved ingredients (name + quantity, with `resolved`/`approximate` flags per §3.4/§3.9 where applicable) + full computed nutrition breakdown (calories/protein/carbs/fat, with `partial`/`approximate` flags per §3.9's now-resolved fallback rule).
- **`GET /api/ingredients` contract (previously undefined — gap caught on second review):** returns the full ingredients list as `{ id, name, category }[]`, sorted alphabetically by `name`. Optional query param `q` does a case-insensitive substring match against `name`, same matching rule as the recipe search (§3.10 `q` above) for consistency. No pagination or result limit — the dataset is 54 ingredients (post-§3.4 fix — was 46 before the 8 missing ones were added), trivially small; the whole (optionally filtered) list is returned every time. This endpoint exists specifically to back the frontend's ingredient-filter autocomplete (§4.1), so it deliberately stays a plain list-and-filter, not a search-ranked endpoint.
- **Error format:** consistent envelope `{ "error": { "code": string, "message": string } }` with correct HTTP status codes — 400 for bad query params, 404 for unknown recipe ID, 500 for unexpected failures.
- **Pagination:** explicitly **out of scope** for all endpoints — the dataset is 15 recipes / 54 ingredients, no pagination needed. State this as a deliberate assumption in Candidate Notes, not an oversight.

### 3.11 — LLM endpoint needs abuse protection before it's live on a public URL
**Correction:** keeping the OpenAI key server-side (§3.3) is necessary but not sufficient once the backend has a real public deploy URL and a real funded API key behind it — anyone who finds the URL could otherwise hit the endpoint directly and run up spend. Adding to §3.3's scope for Iteration 6:
- **Question length cap** (e.g. reject anything over ~500 characters with a 400).
- **Basic rate limiting** — a simple in-memory per-IP limit (e.g. N requests/minute) is enough for a take-home; no need for a distributed rate limiter.
- **Pinned exact model string** committed to code/env (not "whatever's latest" resolved at request time) — resolve the open item in §8 here.
- **Timeout + provider-error handling** — if OpenAI times out or errors, return a clean error to the frontend, don't hang or 500 the whole request pipeline.
- **Visible disabled state** in the UI when the feature is unavailable (key missing, rate-limited, provider error) — already required by §3.3, reiterated here as part of the same defensive package.

### 3.12 — Explicit MVP checkpoint added to the iteration flow
**Decision:** even under the confirmed 3-5 day budget (§3.7), add a hard stop-and-assess gate rather than relying only on the end-of-project cut list in §7. **After Iteration 3 (core frontend + backend fully working, deployed-quality) and again after Iteration 4 (dietary/sort/scale added):** stop and honestly assess pace before continuing. If behind pace at either checkpoint, skip straight to Iteration 8 (writeup + deploy) rather than continuing to layer on bonus features — a deployed, polished core beats an ambitious but half-finished feature set. See §6 for where these gates sit in the iteration list and §7 for what to cut if a gate is missed.

### 3.13 — Automated tests required, not just manual curl checks or a scratch script
**Correction:** Iteration 1 and 2's original "definition of done" allowed "a scratch script" and "manually verifiable (curl/Postman)" as sufficient. That's too weak for the parts of this system with real correctness risk (unit conversion, nutrition math, the §3.4/§3.9 fallback flags, filter semantics) — manual spot-checks don't catch regressions once Iteration 4+ starts changing the same code paths.
**Decision:** add an actual automated test suite (recommend **Vitest** — fast, native TS support, minimal config, pairs well with the `shared` workspace package from §5.1) with a real `npm test` command, covering at minimum:
- Unit-conversion + nutrition module (§3.5, §3.9): mass-mass, volume-volume, density-based volume→mass, count-based reference weights, and the `partial`/`approximate` fallback flags on unmapped units
- Seed-validation script (§3.4): correctly flags known-bad references, doesn't false-positive on good data
- Recipe filtering (name/tags/ingredients/dietary — §3.10): correct AND/OR semantics per filter type
- Invalid query params → 400s, unknown recipe ID → 404 (§3.10's error contract)
**This replaces, not supplements, the "scratch script"/"curl only" language in §6's Iteration 1 and 2 definitions of done** — updated there directly.

### 3.14 — Iteration 1 built; one real architecture snag hit and resolved along the way
**What got built** (see §6 Iteration 1 for the checklist — all done): root npm workspaces (`shared`, `backend-app`, `frontend-app`); `@hells-kitchen/shared` with `types.ts` (§3.10's shapes), `units.ts` (the full three-tier conversion module from §3.9 — mass/volume/count, all 24 density + 21 count reference values populated), `duration.ts` (parses `"20 minutes"` → `20` for sorting); the 8 missing ingredients added to `data.json` (§3.4); `backend-app/src/`: `seedValidation.ts`, `dietary.ts` (§3.2's vegan⊇vegetarian normalization), `nutrition.ts` (§3.5's basis decision, §3.9's partial/approximate contract), `data.ts` (boot-time load + precompute, §5.4), `server.ts` (boots, loads data, one placeholder route — full route contract is Iteration 2). 28 tests passing (`npm test` from root or from `backend-app/`).

**Snag: `shared` as source-only TS broke a compiled production build.** The original plan (§5.1) said `shared` ships as raw TypeScript, no build step, consumed directly by TS-aware tooling. That's fine for `tsx`/`vitest`/Next.js — but the first version of `backend-app`'s `start` script compiled `backend-app` to `dist/` via `tsc` and ran it with plain `node`, which cannot resolve `@hells-kitchen/shared`'s `package.json` `main` field pointing at `src/index.ts` (plain Node has no TypeScript support at all). This is exactly the kind of "workspace friction with the deploy setup" §5.1 flagged as the trigger for falling back to type duplication — but duplication wasn't necessary here. **Resolution:** `backend-app` now runs under `tsx` uniformly in both dev and production — `"dev": "tsx watch src/server.ts"`, `"start": "tsx src/server.ts"`, no compiled `dist/` artifact at all; `tsx` is a `dependencies` entry (not `devDependencies`) since it's needed at runtime. A separate `"typecheck": "tsc --noEmit"` script exists for CI/dev-time type safety without producing build output. This keeps `shared` genuinely source-only as planned, adds no duplication, and is a legitimate, common pattern for small-to-medium Node/TS services — confirmed working end-to-end (`npm start` boots the real server, serves real data). **Relevant for Iteration 8:** Render/Railway's "Start Command" should be `npm start` (or `npm run start --workspace=backend-app`), not a build+`node dist/...` two-step — there is no build step for the backend.

**Also resolved:** the root `vitest.config.ts`'s `include` globs are relative to the config's root, which isn't always `process.cwd()` depending on where `npm test` is invoked from — running `npm test` from inside `backend-app/` found zero tests until its script was changed to `vitest run --root ..`. Noted here since it's a non-obvious gotcha for anyone adding more workspace packages later.

### 3.15 — Iteration 1 implementation reviewed (Codex); one real bug found and fixed, one plan inconsistency corrected
**Real bug: dietary derivation silently dropped unresolved ingredients instead of failing on them.** `data.ts`'s original code filtered out unresolved ingredient lines *before* calling `deriveDietaryTags`, so an unresolved ingredient simply vanished from the intersection rather than causing it to fail. Concretely: a recipe with 4 vegan ingredients and 1 unresolved (`ingredientId` with no matching record) would be claimed **"vegan"** — the unresolved ingredient could be anything, including meat, and the code had no way to know, but asserted the tag anyway. This directly contradicted `dietary.ts`'s own documented contract ("an unknown ingredient can't be assumed to satisfy anything," §3.4) — the contract was written correctly, the caller didn't actually honor it. **Fixed:** any unresolved ingredient in a recipe now makes `dietary` an empty array for that recipe — full stop, no tags asserted — rather than computing an intersection over a shrunk ingredient list. This is currently a dormant/defensive fix, not an active-bug fix: the real dataset has zero unresolved ingredients post-§3.4, so no recipe's dietary output changes today. It matters for the same reason the seed-validation script matters (§3.4) — a permanent safety net against *future* bad data, not a fix for a known-bad case. Added a regression test (`data.test.ts`) that constructs a synthetic recipe with several vegan ingredients plus one unresolved one and asserts `dietary` comes back empty, plus a companion test confirming normal derivation still works once everything resolves.
**Plan inconsistency:** §5.2 said Iteration 1 converts *both* `backend-app` and `frontend-app` to TypeScript — stale; §6 always scoped frontend conversion to Iteration 3, and §5.2 just never got updated to match when that split was decided. Corrected in §5.2 directly; also fixed its stale mention of a `tsc` build step for the backend (superseded by §3.14's `tsx`-only resolution).
**Everything else Codex checked came back clean:** 28/28 tests, backend+shared typecheck, `npm start` boots and serves precomputed data, commit `bdc957a` exists with a clean worktree, frontend correctly untouched.

### 3.16 — Iteration 2 implementation reviewed (Codex); three small gaps found and fixed
**Verdict on the API itself:** correct — filtering, sorting, detail/list projections, the ingredients endpoint, and error envelopes all matched §3.10, 61/61 tests passing, typecheck clean, commit `5c91d9b` clean. Three documentation/coverage gaps, all fixed:
1. **README setup instructions were stale after workspaces landed in Iteration 1** — still said `cd backend-app && npm install` / `cd frontend-app && npm install` separately. Not actually broken (npm workspaces redirect a subfolder `npm install` to a full workspace install regardless), but misleading and redundant — a new contributor following it literally would run `npm install` twice for no reason. Fixed: one `npm install` from the repo root, then per-app `npm run dev`.
2. **Stale `46` ingredient count in three places** (`PLAN.md` §3.10 ×2, `ingredients.ts`'s comment) — the dataset became 54 ingredients once §3.4 added the 8 missing ones, but these three mentions were written before that fix and never updated. Fixed all three.
3. **The 500/`INTERNAL_ERROR` fallback path had zero test coverage** — `app.test.ts` covers 400s and 404s (real `ApiError` subclasses thrown from real routes) but nothing exercised `errorHandler`'s generic catch-all for a non-`ApiError` throw. Added `errors.test.ts`, testing `errorHandler` directly against a minimal throwaway Express app (rather than adding a test-only route to the real `app.ts`, which would pollute production route code) — confirms the 500 envelope is correct and that the real error message never leaks to the client (always the generic "Something went wrong."). 64/64 tests passing now.

### 3.17 — Iteration 3 built: the frontend core, plus a real visual-verification pass that earned its keep
**Architecture decisions made while building:**
- **Filtering via a plain native `<form method="GET">`, not a client-side router.push.** Submitting navigates the browser to `/recipes?q=...&tags=...&ingredients=...`, which the `/recipes` server component re-fetches against directly. No `"use client"` needed for the basic filter bar at all — works with JS disabled, filtered views are bookmarkable/shareable for free, and it's the pattern the Next.js team itself recommends for exactly this "filtered list driven by URL state" shape.
- **Next.js's file-based conventions carry the loading/error/not-found states** (`loading.tsx`, `error.tsx`, `not-found.tsx`) rather than hand-rolled client-side spinner/error state — `page.tsx` just lets exceptions propagate (a 404 from the backend calls `notFound()`, anything else rethrows) and the framework handles the rest. Idiomatic App Router, less code than doing it by hand.
- **Next 15.1.6 → 15.5.23 first**, resolving §8's flagged critical CVE (dev-server origin verification). The remaining `postcss`/`sharp` high-severity advisories only clear via a Next 16 major bump — deliberately not chased this iteration (breaking-change risk mid-build for advisories with low practical exposure here: no `next/image` usage, no attacker-controlled CSS input). Logged as a known, accepted trade-off, not silently ignored.

**The verification pass is the notable part.** Typecheck and `next build` both passed cleanly, and could easily have been reported as "done." Instead, since the user's whole reason for green-lighting this iteration was "I want something to actually look at," the app was launched for real (both servers) and driven with a headless-Chromium Playwright script (no project run-skill existed yet, so one was improvised per the `run` skill's browser-driven fallback pattern) — nav to `/recipes`, screenshot, filter, screenshot, click into a detail page, screenshot, hit a 404, screenshot, resize to a mobile viewport, screenshot. **Looking at the actual screenshots surfaced 3 real bugs that typecheck/build could never have caught:**
1. **The card's PREP/COOK/SERVES/CALORIES row was a cramped 4-column grid** — `"545/serving"` was visibly truncated to `"545/ser"` on desktop and completely cut off on mobile. Fixed: 2×2 grid instead of 1×4, plus `white-space: nowrap` on the value.
2. **Tags rendered twice on any recipe where a raw tag and a derived dietary badge shared a word** (e.g. Margherita Pizza showing "vegetarian" as both the orange dietary badge and a plain gray tag chip) — both pieces of data are individually correct (§3.2's derivation vs. the seed data's manual tag), but showing both reads as a duplicate-content bug. Fixed with a new `dedupeTagsAgainstDietary` helper (`lib/tags.ts`, tested), used on both the card and detail page.
3. **A real, non-obvious CSS bug**: combining the global `.container` class (`max-width: 1100px; margin: 0 auto`) with a page-specific wrapper class that *also* declared its own smaller `max-width` (520px/480px, on the error/not-found pages) caused the browser to center using the *smaller* width instead of leaving the content flush-left like every other page — `margin: 0 auto` from `.container` was never overridden by the wrapper's own rules, so it centered a narrow box in the middle of the screen instead of aligning it with the rest of the app's content. Only visible by actually looking at a screenshot; the CSS reads as innocuous in isolation. Fixed by explicitly resetting `margin: 0` on each affected wrapper, with a comment explaining why (so it doesn't silently regress if someone adds a similar wrapper later).

This is the same lesson as §3.15's dietary bug and §3.16's Codex findings, generalized: **passing typecheck/tests is necessary, not sufficient — verification has to exercise the thing a user would actually see/do.** Recorded here as a reusable practice, not a one-off: future iterations with a visual/interactive surface (Iteration 4's filter chips, Iteration 5's shopping list, Iteration 6's LLM panel) should get the same screenshot-based pass before being called done, not just `npm test` + `next build`.

**Checkpoint 1 (§3.12) is now reached** — core frontend + backend fully working, deploy-quality by the plan's own definition. Per §3.12, this is a legitimate stopping point: a complete, submittable project on its own. Continuing to Iteration 4+ is a deliberate choice to keep going, not a default.

### 3.18 — Two user-reported issues after Iteration 3 shipped, fixed same-day
**Hydration console warning** — the user hit a React hydration-mismatch warning on `/recipes`. Diagnosed by reading the actual diff React printed: the only mismatched attribute was `data-phia-extension-fonts-loaded="true"` on `<html>` — not anything `layout.tsx` renders (verified: no `typeof window` branches, `Date.now()`, `Math.random()`, or locale-dependent formatting, the actual causes React's own error message lists). This is a browser extension injecting into the DOM before hydration, a scenario Next.js explicitly documents `suppressHydrationWarning` for. Added it, scoped to just the `<html>` tag's own attributes — doesn't hide a real mismatch anywhere else in the tree.

**A real layout bug, confirmed by the user's own screenshot** — "PREP" and "20 minutes" weren't sitting flush under each other on the recipe cards. Root cause: `globals.css`'s reset (margin/padding zeroed on `body/h1/h2/h3/p/ul/figure`) never included `dl`/`dt`/`dd` — so `<dd>` kept the browser's default UA-stylesheet indent (`margin-inline-start`, ~40px), pushing every value visibly right of its label. Confirmed with `getBoundingClientRect()` before/after (dt/dd left edges went from misaligned to identical) rather than eyeballing it. Fixed in the global reset, plus a small intentional 2px gap via `dt`'s `margin-bottom` so label and value don't sit perfectly flush with zero breathing room.

**Process note, logged so it doesn't repeat:** the hydration-fix commit accidentally included a stray `.layout.tsx.swp` vim swap file via `git add -A` — removed, and `*.swp`/`*.swo`/`*~` added to `.gitignore`. A reminder to look at the actual diff before committing even a "small" fix, not just trust `git add -A`.

### 3.19 — Design system pass, pulled forward from Iteration 7 (user request)
**Why now, not at Iteration 7 as originally planned:** the user pointed out the app "looks barebones and vibecoded" — a fair read. Iteration 7 as originally scoped was UX *robustness* (mobile drawer, edge cases), not visual design quality, and "UI/UX design" is a named README evaluation criterion — under-investing here isn't a neutral scope choice. Doing a real design pass now, before Iteration 4-6 add more UI surface (filter chips, scaling controls, a shopping-list page, an LLM chat panel), means all of that new UI inherits a real design system instead of being built plain and retrofitted later.

**What changed** (`frontend-app/app/`):
- **Typography**: replaced the system-UI font stack with a deliberate pairing via `next/font/google` — Fraunces (a characterful serif, food-editorial feel) for headings, Inter for body/UI text. Self-hosted at build time, zero extra runtime requests, negligible bundle impact (confirmed via `next build`'s output).
- **Color/token system formalized** in `globals.css`: warm off-white/charcoal instead of stark white/black, a proper spacing scale (`--space-1` through `--space-8`, 4px base), radius tokens (`sm`/`md`/`lg`), shadow tokens, and a real dark-mode palette — **verified visually for the first time this iteration**; dark mode existed in code since Iteration 3 but had never actually been screenshotted before now.
- **Header**: sticky, a 🔥 logo mark next to the wordmark (matches the "Hell's Kitchen" name instead of being purely typographic).
- **Recipe cards**: real elevation (shadow tokens, hover lift), a divider between description and stats, difficulty badges as colored pills, tabular-number alignment on stats so values don't jitter.
- **Detail page**: section headings got icons (🥘 Ingredients, 📋 Instructions, 🔥 Nutrition), the nutrition block became a bordered card instead of a bare table, difficulty shown as the same colored pill as the list view for consistency.
- **Empty/error/not-found states**: each got a relevant icon instead of being plain text blocks.
- **Filter bar, buttons, inputs**: consistent focus rings (`box-shadow` with `--accent-soft`, not just a browser-default outline), hover/active transitions, tokenized throughout instead of one-off hex values.

**Verification:** the same screenshot-based process from §3.17 — Playwright, both `prefers-color-scheme: light` and `dark`, desktop/tablet(820px)/mobile(390px) viewports, console-error check on every pass. Zero console errors across all of it; this pass is what caught dark mode had never actually been looked at before. 82/82 tests still passing, typecheck clean, `next build` clean.

### 3.20 — Full redesign to match a user-supplied UI mockup, replacing §3.19's direction entirely
**What happened:** the user said §3.19's redesign "still don't like the style" and provided a real UI mockup (a Claude design-canvas export with 6 layout variants — `Hells Kitchen Revamp.dc.html` in the repo root, plus a published Artifact link) showing a completely different visual language: recipes as **engineering/blueprint spec sheets**, not food-editorial. Barlow Condensed (technical, uppercase, tracked) instead of a warm serif, a cool steel-blue accent (`#5980a6`) instead of terracotta, **zero border-radius anywhere**, corner-bracket ("blueprint") framing instead of shadows, dotted-line dividers, monospace-style catalog numbers per recipe. Read all 6 variants before starting; picked **variant 1a** (filter rail + numbered card grid) as the primary layout — it's the only non-photo variant, and there's no product photography in this dataset to power the photo-led variant (1b).

**Scope decision — this wasn't purely cosmetic.** Several controls the mockup specifies map directly onto already-planned functionality, so building them "in the new style" meant building the real feature, not a static mockup of it:
- **Recipe scaling (servings stepper) — genuinely implemented**, pulled forward from Iteration 4. Pure client-side math against data already in the `RecipeDetail` response (reusing `parseAmount` from `@hells-kitchen/shared`, §5.1's "one unit-conversion module" paying off again): ingredient amounts scale by `servings / baseServings`; nutrition **per serving stays constant** (a serving is a serving) — only the "recipe total" line scales (`total = perServing × servings`). Verified end-to-end, not just visually: doubled servings 4→8 on Margherita Pizza and confirmed every ingredient amount exactly doubled (e.g. "2 cups" → "4 cups") and the total recalculated to exactly `545.1 × 8 = 4360.8`.
- **Dietary + tag checkboxes, a difficulty toggle, and ingredient chips — all real, wired filters**, not decoration. Dietary/tags/difficulty render as server-computed `<a href>` links (new `lib/filterUrl.ts`, tested — toggles one value in/out of the URL's filter state while preserving everything else, no client JS needed for the common case). Ingredients needed one small client component (`IngredientChips.tsx`) since free-text add/remove isn't a fixed small set the way checkboxes are.
- **New backend filter**: `difficulty` exact-match query param (`filtering.ts`, tests in both `filtering.test.ts` and `app.test.ts`) — the mockup's segmented control needed it and it didn't exist yet.
- **Not pulled forward**: the mockup's drag-handle time-range slider (existing sort-by-prep/cook-time covers the same practical need without custom slider UI) and the table/photo list variants (1b/1c) as alternate views.
- **"Add to shopping list" / "Save recipe" buttons render, disabled**, with a `title` tooltip ("Coming in a future update") — those are genuinely Iteration 5 features, not built yet. Rendering them (per the user's "even if some items aren't implemented yet, build it like that") without wiring fake functionality behind them was the honest middle ground.
- **404 page shows real suggested recipes** — `not-found.tsx` is a server component like any other, so it fetches 3 real recipes for the "Try instead" list rather than hardcoding fake ones the mockup used as placeholder content.

**Two real bugs caught by the same screenshot-verification discipline as §3.17/§3.19 — both would have shipped invisibly without it:**
1. **A self-referential CSS custom property silently broke both fonts.** `globals.css` had `--font-display: var(--font-display), "Arial Narrow", sans-serif;` — referencing itself inside its own definition. Per spec, a custom property that references itself becomes "guaranteed-invalid" at computed-value time; every `var(--font-display)` consumer got nothing, and headings fell through to the browser's bare default serif font. Caught because Barlow Condensed (sans, geometric) rendering as generic serif was visually obvious in a screenshot. **This exact bug was already present in §3.19's Fraunces pass** — invisible there only because the accidental fallback (system serif) happened to look similar enough to the intended serif that nothing looked wrong. Fixed properly this time: next/font already provides the resolved font stack via the `.variable` className on `<html>`; `:root` must never redeclare the same custom property, fallbacks belong inline at each `var()` use site instead.
2. **Recipe catalog numbers were positional, not stable.** First draft numbered cards by their position in the (possibly filtered/sorted) rendered array — meaning the same recipe would show a different number depending on which filters were active, which reads as a bug in what's supposed to be a fixed catalog reference. Fixed to derive the number from the recipe's own `id` (already `"1"`–`"15"` in the seed data) instead of array position.

**Also, an environment mistake, not a code bug:** ran `next build` (production) in the same `frontend-app` directory while `next dev` was also running against it — both write to `.next/`, and doing so concurrently corrupted the dev server's build manifests (`ENOENT` errors, 500s on every route). This is a known Next.js footgun, not an app defect; fixed by stopping the dev server, deleting `.next/`, and restarting clean. Noted here so it doesn't get mistaken for a regression later, and as a reminder not to run production builds against a live dev server's directory again.

**Verification:** typecheck clean, **100/100 tests passing** (86 backend + 14 new frontend: `filterUrl.test.ts` covering the URL-toggle logic that drives the whole filter rail), `next build` clean, and the full Playwright pass — light/dark × desktop/tablet(820px)/mobile(390px) on both pages, plus **genuinely triggered** (not just code-reviewed) loading state (via network throttling) and both 404 states (bad recipe ID and an unmatched route). Zero console errors throughout. Filter composition tested by actually clicking through the UI: dietary + difficulty + ingredient + sort simultaneously, confirmed all four compose correctly in the URL and produce a correct (empty, in that case) result set.

---

## 4. Final feature scope

### 4.1 Core (required, non-negotiable — from README)
- `GET /api/recipes` — list with basic info, query params for search/filter
- `GET /api/recipes/:id` — full detail: ingredients (names + quantities, joined from ingredient IDs), instructions, tags, computed nutrition
- `GET /api/ingredients` — supporting endpoint for filter/search UI (autocomplete)
- Filtering: by name (case-insensitive substring, per §3.10), tags (exact match, multi-select, AND), ingredients (by name, joined against IDs, ANY)
- Nutrition calculation module: generic mass-mass/volume-volume conversion table **plus** per-ingredient density and count-unit reference-weight lookups (§3.9), applied consistently, basis assumption per §3.5
- Frontend `/recipes` — list, search, tag filter, ingredient filter, responsive grid, loading/error/empty states
- Frontend `/recipes/[id]` — ingredients w/ quantities, instructions, tags, nutrition table, loading/error/empty states

### 4.2 The 5 bonus features chosen (from README's example list)
1. **Dietary filters** — vegan/vegetarian/gluten-free/keto/etc., derived from ingredient `dietary[]` intersection with normalization (§3.2)
2. **Sorting** — prep time, cook time, difficulty, calories, dropdown on `/recipes`
3. **Recipe scaling** — servings input on detail page, live recalculation of ingredient amounts and nutrition
4. **Shopping list generator** — select multiple recipes / "add to list" per recipe, aggregate ingredients **by `ingredientId`** (not display name) with unit-aware merging that only sums compatible units and keeps incompatible units as separate line items (§3.9), dedicated `/shopping-list` page with checkboxes
5. **LLM feature** — "Ask about this recipe" panel, grounded via backend proxy to OpenAI (§3.3)

### 4.3 Above-and-beyond (stand-out signal, not asked for)
- Shared TypeScript types between backend and frontend — single source of truth for `Recipe`/`Ingredient` shapes (mechanism TBD, see §5.1 and §8)
- One unit-conversion module reused by both nutrition calc and shopping-list merging
- Lightweight preference profile via localStorage (dietary restrictions/interests, auto-applied filter) — §3.1
- Favoriting via localStorage — documented as an explicit assumption (no auth in scope)
- Skeleton loaders / empty states / 404 handling for bad recipe IDs, no search results, etc.
- Mobile-considered filter UX — collapsible filter drawer on small screens rather than a cramped sidebar
- Seed-data validation script on server boot — warns, doesn't crash (§3.4)
- A real deploy — Vercel (frontend) + Render/Railway (backend), env-wired (§3.6)
- Well-written Candidate Notes — nutrition-basis assumption stated explicitly, what's stubbed vs. production-ready, "with more time" list

---

## 5. Architecture decisions

### 5.1 Shared types & the unit-conversion module — mechanism confirmed, implemented in Iteration 1
The *what* was decided here (§4.3); the *how* was **npm workspaces**, confirmed working end-to-end in Iteration 1 (§3.14) — no fallback to duplication needed, though one real deploy-shaped snag was hit and resolved along the way (§3.14's `tsx`-not-`tsc` resolution).
- Root-level `package.json` with `"workspaces": ["shared", "backend-app", "frontend-app"]` and `shared/` (`@hells-kitchen/shared`) exporting the `Recipe`/`Ingredient`/etc. TypeScript types **and** the full unit-conversion module (gram-conversion table + density/count-unit lookups, §3.9).
- Both `backend-app` and `frontend-app` depend on `@hells-kitchen/shared` as a local workspace package and import from it directly — no code duplication, no manual copy-paste sync. `backend-app` has consumed it since Iteration 1; `frontend-app` will start in Iteration 3.
- Alternative considered and rejected: duplicating a `types.ts` file in both apps, kept manually in sync — exactly the anti-pattern the above-and-beyond list calls out avoiding. Not needed — workspaces worked, once the source-only-package-vs-compiled-build friction in §3.14 was resolved.

### 5.2 TypeScript migration
Both apps started as plain JS (§2). Since shared types and "TypeScript/JavaScript best practices" are both explicit evaluation/above-and-beyond items, both get converted — not optional, it's load-bearing for §5.1. **Corrected on external review (this section previously said both apps convert in Iteration 1 — inconsistent with §6, which always scoped it as backend-app in Iteration 1, frontend-app in Iteration 3):** `backend-app` was converted in Iteration 1, running under `tsx` in both dev and production with no compiled build step (§3.14 — not "`ts-node`/`tsx` + build step" as this section previously and inaccurately said). `frontend-app`'s conversion is Iteration 3's job (Next.js has first-class TS support, low-friction migration expected).

### 5.3 Shopping list aggregation: client or backend? — open, lean client-side
The shared unit-conversion module (§5.1) is importable from both sides, so shopping-list ingredient aggregation doesn't strictly need a backend round-trip — it can happen client-side once the relevant recipes' full ingredient data is fetched. Leaning **client-side** for simplicity (no new backend endpoint required, `/shopping-list` page just merges already-fetched recipe data). Revisit only if the aggregation logic turns out to need data the client wouldn't otherwise fetch (unlikely, given recipes already carry full ingredient lists).

### 5.4 Data layer
`data.json` stays the mock DB (per README — no real database in scope). Backend will read it once at boot into memory, and at that same boot step: run the seed-validation pass (§3.4), and **precompute per-recipe derived fields** that Iteration 4's filters/sorting depend on — the normalized `dietary[]` array (§3.2) and the base-servings `caloriesPerServing`/`nutritionPartial` summary (§3.9, §3.10) — so list requests never recompute them per call. **This is a planned change, not existing behavior** — the current placeholder `server.js` re-reads and re-parses the file on every request (§2). No write endpoints are in scope (recipes/ingredients are read-only from the frontend's perspective; favorites/profile/shopping-list-selections are client-only via localStorage, §3.1/§4.3).

---

## 6. Iteration plan

Ordering is dependency-driven: shared foundation before anything consumes it, backend before frontend, filters before the dietary-derivation layer that extends them, cross-cutting bonus features after the modules they reuse exist, LLM after the profile exists (so it can be grounded in it), polish before deploy.

**Legend:** ✅ done · 🔲 not started. Iteration 1 is done (see below); Iterations 2-9 are still 🔲.

### Iteration 0 — Planning (this document) — ✅ done
Scope agreed, seed data audited, provider choices made, decision log written.

### Iteration 1 — Backend foundation (no UI yet) — ✅ done
- [x] Set up TypeScript in `backend-app` (§5.2) — via `tsx`, no compiled build step (§3.14)
- [x] Stand up the `shared/` workspace package with `Recipe`/`Ingredient`/etc. types (§5.1)
- [x] Data access layer over `data.json` (load once at boot, in-memory) — `backend-app/src/data.ts`
- [x] Fix the 8 missing ingredient records directly in `data.json` (§3.4)
- [x] Seed-validation script: warns (not crashes) on any remaining unresolved `ingredientId`s, runs at boot — `backend-app/src/seedValidation.ts`
- [x] "Unresolved ingredient" response contract (§3.4) — `ResolvedIngredientLine.resolved`, implemented in `nutrition.ts`
- [x] Unit-conversion module (shared package) — full three-tier table: mass, volume+density, count-unit — `shared/src/units.ts`
- [x] Nutrition calculation module — basis assumption resolved (per-100g, §3.14), `partial`/`approximate` fallback rule implemented — `backend-app/src/nutrition.ts`
- [x] Boot-time precompute of per-recipe `dietary[]` and `caloriesPerServing`/`nutritionPartial` — `backend-app/src/data.ts`
- [x] Dietary normalization module (§3.2) — `backend-app/src/dietary.ts`, vegan⊇vegetarian rule, verified against the Margherita Pizza proof case
- **Definition of done — met:** 30 automated tests passing (`npm test`, Vitest; 28 originally + 2 regression tests from the §3.15 dietary bugfix) covering unit-conversion (mass/volume/count tiers, fallback contract), nutrition math, dietary derivation (including the unresolved-ingredient edge case), and seed validation — plus an end-to-end smoke test (`npm start`, real `curl` against `/api/recipes`, verified the Margherita Pizza dietary/calorie output by hand). Full route contract (§3.10) is still Iteration 2 — this iteration's `/api/recipes` route is a placeholder, not yet spec-compliant.

### Iteration 2 — Backend API (core requirement) — ✅ done
- [x] `GET /api/recipes` with search (case-insensitive substring on title/description) + tag filter (AND) + ingredient filter (ANY, by exact id or substring name) + dietary filter (AND, against the boot-precomputed `dietary[]` field) + `sort`/`order` — `backend-app/src/filtering.ts` + `routes/recipes.ts`, per the §3.10 contract
- [x] `GET /api/recipes/:id` with joined ingredients and full computed nutrition — `routes/recipes.ts`
- [x] `GET /api/ingredients` with optional `q` substring filter, alphabetical, no pagination — `routes/ingredients.ts`
- [x] Consistent error handling — `errors.ts`: `ApiError`/`BadRequestError`/`NotFoundError` + Express error middleware, the `{ error: { code, message } }` envelope from §3.10 on every failure path including unmatched routes (not Express's default HTML 404)
- **Definition of done — met:** 64 automated tests passing (30 from Iteration 1 + 17 in `filtering.test.ts` covering search/tag/ingredient/dietary semantics and sort null-handling + 14 in `app.test.ts`, an HTTP-level supertest suite hitting the real Express app end-to-end: 200s with correct shapes, 400s on invalid `sort`/`order`, 404s on unknown recipe ID and unmatched routes, zero-results-not-an-error on unrecognized filter values + 3 in `errors.test.ts`, added on review (§3.16) to directly cover the 500/`INTERNAL_ERROR` fallback that app.test.ts's real routes never happened to trigger). Plus a manual `curl` pass against a booted server as a final sanity check (confirmed: dietary=vegan correctly excludes Margherita Pizza and includes exactly the 3 genuinely-vegan recipes; sort=calories&order=desc correctly descending).
- **Architecture note:** `server.ts` now just boots data + calls `createApp()` (new `app.ts`) and listens — the app-construction/route-wiring is separate from the process entry point specifically so `app.test.ts` can exercise real HTTP requests via `supertest` without binding a port.

### Iteration 3 — Frontend core (core requirement) — ✅ done
- [x] Bumped `next` 15.1.6 → 15.5.23 first (§8's flagged open item) — resolved the critical dev-server-origin-verification CVE; remaining `postcss`/`sharp` high-severity advisories are transitive-inside-Next and only fixable via a Next 16 major bump, accepted as a documented trade-off for now (§3.17)
- [x] `frontend-app` converted to TypeScript, wired to `@hells-kitchen/shared` via `transpilePackages` (§5.1/§5.2) — confirmed working, no duplication
- [x] API client (`lib/api.ts`) — typed wrapper over the §3.10 contract, `ApiRequestError` carrying the backend's `code`/status, + unit tests
- [x] `/recipes` — list page, search/tags/ingredients filter bar (plain native `<form method="GET">`, no client JS — §3.17), responsive grid, result count, empty state
- [x] `/recipes/[id]` — detail page: ingredients w/ quantities + resolved/approximate badges, instructions, tags, nutrition table (per-serving + recipe-total)
- [x] Loading states (`loading.tsx`, Next's Suspense convention), error states (`error.tsx`, retry button), not-found state (`not-found.tsx`, both route-level and global)
- **Definition of done — met:** 82 automated tests passing (64 backend + 18 new frontend: `api.test.ts`, `searchParams.test.ts`, `tags.test.ts`) + a real Playwright-driven browser verification pass (§3.17) — not just typecheck/build, actual screenshots of the actual rendered app, which caught and led to fixing 3 real visual bugs before they'd have been discovered by a human tester.

> **🛑 Checkpoint 1 (§3.12):** stop here and honestly assess pace. Core + deploy-ready is a complete, submittable project on its own. If behind schedule, skip to Iteration 8 (writeup + deploy) now rather than continuing.

### Iteration 4 — Bonus batch 1: filter/sort/scale (self-contained, extends existing filter logic) — 🔲
- Dietary filter **UI** — the derivation/normalization (§3.2) and the `dietary` query param (§3.10) are backend work already done in Iterations 1-2; this iteration is the `/recipes` filter chips/checkboxes that call it
- Sorting **UI** — dropdown on `/recipes` for prep time, cook time, difficulty, calories, wired to the `sort`/`order` query params (§3.10) — the `caloriesPerServing` list field it depends on is already precomputed as of Iteration 1
- Recipe scaling — servings input on detail page, live recalculation of ingredient amounts + nutrition (reuses the unit-conversion module)

> **🛑 Checkpoint 2 (§3.12):** assess pace again. If behind, skip to Iteration 8. If on pace, continue to Iteration 5+.

### Iteration 5 — Lightweight profile + cross-cutting bonus batch 2 — 🔲
- Lightweight dietary/interest profile (localStorage) — build this *right after* Iteration 4's dietary filters, since its whole value is auto-applying as their default state (§3.1) — don't let it drift to being bundled arbitrarily with unrelated features
- Shopping list generator — multi-recipe select / per-recipe "add to list," merge by `ingredientId` with compatible-unit-only summing (§3.9), `/shopping-list` page with checkboxes (leaning client-side aggregation, §5.3)
- Favoriting via localStorage

### Iteration 6 — LLM feature — 🔲
- Backend proxy endpoint to OpenAI, API key server-side only (§3.3)
- "Ask about this recipe" panel on `/recipes/[id]`, grounded in that recipe's actual ingredients/instructions
- Abuse protection per §3.11: question length cap, basic per-IP rate limiting, pinned exact model string, timeout/provider-error handling
- Fail-soft behavior when `OPENAI_API_KEY` is absent, or the feature is rate-limited/erroring (§3.3, §3.11) — visible disabled state, never a 500
- Proactive conflict/substitution banner using the saved profile from Iteration 5

### Iteration 7 — Polish pass — 🔲
- Mobile filter drawer (collapsible, not a cramped sidebar), full responsive check
- Skeleton loaders everywhere data is fetched
- Edge cases: no search results, malformed/nonexistent recipe IDs (404 page), empty states

### Iteration 8 — Writeup + deploy — 🔲
- `## Candidate Notes` section appended to `README.md`: setup instructions for anything added, implementation choices, completed features list, assumptions (nutrition basis from §3.5, no-auth/localStorage-profile from §3.1, favoriting from §4.3), known limitations/bugs, "additional features with more time" list
- Deploy frontend (Vercel) + backend (Render/Railway), wire env vars (`OPENAI_API_KEY`, API base URL, etc.) between them
- Smoke-test the live link end to end before calling it done
- Zip the project for submission, send to scott.nguyen@sprx.tax & anthony.difalco@sprx.tax with the deployed link

### Iteration 9 — Stretch only, if time remains after Iteration 8 — 🔲
- Real lightweight auth (email+password or magic link), server-stored profiles replacing localStorage, favorites/profile behind login. Not planned for in the 3-5 day budget (§3.7) — pure upside if reached, no loss if not.

---

## 7. Priority order if time runs short (even though budget is currently 3-5 days)

This is the fallback list if a checkpoint in §6/§3.12 is missed and cutting mid-iteration (rather than cleanly stopping at a checkpoint) becomes necessary. Protected, cut last, in order of protection:
1. Core requirements (§4.1) — non-negotiable regardless of time
2. Deploy (§3.6) — explicitly named as bonus points in the README, de-risks the whole submission
3. Candidate Notes writeup — required for submission regardless of feature count
4. Iterations 4 (dietary/sort/scale) — cheapest, highest-value bonus batch, reuses existing filter/unit modules
5. Shared types + unit-conversion module (§5.1) — architecture decision, not a bolt-on feature; hard to retrofit late, so don't defer it even under time pressure
6. Seed-validation script + data fix (§3.4) — cheap, prevents visible demo bugs

Cut first if truly squeezed: favoriting, shopping list, LLM panel, mobile drawer polish — in roughly that order. Iteration 9 (real accounts) was never in scope for this budget.

---

## 8. Open questions / not yet decided

Track these here as they get resolved — update this section, don't just delete it.

- [x] ~~**Shared-types mechanism** (§5.1): npm workspaces vs. manual duplication~~ **Resolved in Iteration 1 (§3.14):** npm workspaces, confirmed working end-to-end for dev/test/start. No fallback to duplication needed.
- [x] ~~**Nutrition basis** (§3.5)~~ **Resolved in Iteration 1 (§3.14):** implemented as per-100g in `backend-app/src/nutrition.ts`, documented inline at the top of that file.
- [ ] **Shopping list aggregation location** (§5.3): leaning client-side; revisit only if a concrete reason to move it server-side surfaces. Still open — Iteration 5.
- [x] ~~**Git repo**: not yet initialized.~~ **Resolved (§3.8, §2):** repo already exists at the project root, on `main`, tracking `origin/main`. Iteration 1's work is committed on top of it locally (`bdc957a`, `5ec320a` — not yet pushed to `origin`).
- [ ] **Deploy target confirmation**: Vercel + Render/Railway assumed (§3.6); not yet actually provisioned/confirmed available. Still open — Iteration 8.
- [ ] **OpenAI model choice** (§3.3, §3.11): "a cheap/fast model" — pin the exact model string when Iteration 6 starts, based on whatever's current/available at build time. Must be a hard-pinned constant, not resolved dynamically per request.
- [x] ~~**Exact reference values** for the ingredient-specific unit tables (§3.9)~~ **Resolved in Iteration 1:** all 21 count-unit weights and 24 `gramsPerCup` density values are populated in `shared/src/units.ts` (USDA-ish approximations, as anticipated — good enough for a take-home, not claimed lab-precise).
- [ ] **Rate-limit thresholds** for the LLM endpoint (§3.11) — pick specific numbers (requests/minute, max question length) when Iteration 6 starts.
- [x] ~~`frontend-app`'s pinned `next@15.1.6` has known vulnerabilities~~ **Resolved in Iteration 3 (§3.17):** bumped to `next@15.5.23`, clearing the critical dev-server-origin-verification CVE. Remaining high-severity `postcss`/`sharp` advisories are transitive inside Next itself and only clear via a Next 16 major bump — deliberately not chased (breaking-change risk vs. low practical exposure: no `next/image`, no attacker-controlled CSS). Revisit if there's time in the polish pass (Iteration 7) or note as a known limitation in Candidate Notes (Iteration 8).

---

## 9. How to use this file going forward

- When a decision changes, add a new dated entry to §3 rather than silently editing an old one — the point is to preserve *why* something changed, not just the current state.
- When an iteration starts/finishes, flip its status marker in §6.
- When an open question in §8 gets resolved, move the resolution into §3 as a proper decision entry and check the box in §8.
- Candidate Notes in the final `README.md` (Iteration 8) should be a distilled, reader-facing summary — this file is the full working history behind it, not a replacement for it.
