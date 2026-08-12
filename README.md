# Recipe Manager - Full Stack Take-Home Exercise

## Overview
Create a recipe management application that allows users to view, search, and organize recipes. This exercise tests your ability to build a full-stack web application with a focus on data relationships and user experience.

## Tips
- Use whatever frameworks/tools you're most comfortable with
- Focus on creating a working MVP before adding advanced features
- Be sure to document any assumptions or known limitations
- Test your application with different scenarios

## Setup Instructions

This repo is an npm workspaces monorepo (`shared`, `backend-app`, `frontend-app`) — install once from the repository root, not separately inside each app. See `PLAN.md` §5.1 for why.

```
npm install   # from the repo root — installs shared, backend-app, and frontend-app together
```

#### Backend
```
cd backend-app
npm run dev # Starts express server on port 8080
```

#### Frontend
```
cd frontend-app
npm run dev # Starts nextjs frontend server on port 3000
```

#### Database setup
```
The application uses a JSON file (`data.json`) as a mock database
```

**Note: Feel free to use whatever frontend or backend framework you want. The sample contains a Next.js + Express server scaffold, but use whatever you're comfortable with.**

## Requirements

#### Core Features (Required)
- Display a list of recipes with their basic information (`/recipes`)
- Implement recipe detail page (`/recipes/:id`) showing:
  - Ingredients with quantities
  - Cooking instructions
  - Tags
  - Nutritional information (calculated from ingredients)
- Add search/filter functionality on (`/recipes`) by:
  - Recipe name
  - Tags
  - Ingredients

#### Example Advanced Features (Bonus Points. Feel free to implement any of these or add your own. Some examples below)
- Implement dietary restriction filters (e.g., vegetarian, vegan, gluten-free)
- Create a calorie calculator based on serving size
- Add recipe scaling functionality (e.g., adjust ingredients for different serving sizes)
- Implement recipe favoriting/saving
- Add sorting options (prep time, difficulty, etc.)
- Add a "shopping list" generator for selected recipes
- Incorporate an LLM feature
- Types

## Evaluation Criteria
- Code organization and clarity
- UI/UX design and responsiveness
- API design and implementation
- Error handling and edge cases
- Performance considerations
- TypeScript/JavaScript best practices 

## Submission
1. Update this README with a new section below called `Candidate Notes`:
   - Setup instructions if you've added any requirements
   - Brief explanation of your implementation choices
   - List of completed features
   - Any assumptions made
   - Known limitations or bugs
   - Additional features you'd add with more time
 

2. Send us (via email to scott.nguyen@sprx.tax & anthony.difalco@sprx.tax):
   - A zip file of the entire project (frontend and backend)
   - A link to a deployed version of the application (bonus points)


Good luck! We're excited to see your implementation.

## Candidate Notes

**Live deployment:** https://hells-kitchen-frontend.vercel.app
(backend: https://hells-kitchen-backend-production.up.railway.app — Express API, not meant to be browsed directly)

The full decision log for this project — every architectural choice, every bug found and how, every external (Codex) review round and what came of it — lives in [`PLAN.md`](./PLAN.md). It's long on purpose: it was written to let a new agent or reviewer pick up the project with full context, not just a feature list. This section is the condensed version.

### Setup instructions beyond the base README

This became an npm workspaces monorepo (`shared`, `backend-app`, `frontend-app`) — install once from the repo root as documented above, not separately per app. Two environment files matter beyond that:

- `backend-app/.env` (gitignored, copy from `backend-app/.env.example`): `OPENAI_API_KEY` for the "Ask about this recipe" panel. The app runs completely fine without it — the feature just shows a clear disabled state instead of a crash (see "Assumptions," below).
- `frontend-app/.env.local` (or platform env vars in production): `NEXT_PUBLIC_API_URL`, the backend's base URL. Defaults to `http://localhost:8080` for local dev.

### Implementation choices worth calling out

- **Shared TypeScript types** (`@hells-kitchen/shared`, a source-only workspace package — no build step, consumed via `tsx` on the backend and `transpilePackages` on the frontend) so the two apps can't silently drift on the `Recipe`/`Ingredient` shapes.
- **A real three-tier unit-conversion system** for nutrition and shopping-list math: pure mass conversions (universal), volume conversions (universal ratios, but volume→mass needs a per-ingredient density), and count/descriptive units ("2 cloves," "1 medium") which need a per-ingredient-and-unit reference weight. This is the one piece of the app I'd call genuinely non-trivial engineering rather than CRUD-with-styling.
- **No real authentication.** Favoriting, a dietary/interest profile, and a shopping list are all `localStorage`-only, keyed by device/browser rather than account. The README doesn't ask for accounts, and building real auth on a recipe take-home reads as scope-mismatch more than initiative — see PLAN.md §3.1 for the full reasoning. It's a deliberate choice, not an oversight.
- **The LLM feature is a grounded, narrow assistant, not a generic chatbot** bolted onto the page. The backend proxy builds its system prompt from the specific recipe's actual ingredients/instructions/nutrition, explicitly instructed not to invent facts about the recipe but to still give normal cooking help (substitutions, technique questions) — off-topic questions get politely declined. It also receives the visitor's saved dietary profile so it can proactively flag conflicts. Backend-only API key, question-length cap, per-IP rate limiting, and a pinned model string (`gpt-4o-mini`) so nothing about the endpoint depends on "whatever's currently cheapest."
- **A deliberate design pass.** The initial build was functionally complete but visually generic; a later pass rebuilt the whole frontend against a real UI mockup (an "engineering spec sheet" look — corner-bracket card framing, dotted rules, a condensed technical typeface) rather than shipping default-Tailwind-card styling.
- **The recipe dataset was expanded offline, not via a live API.** Started at 15 recipes/54 ingredients; grew to 32 recipes/54 ingredients through two batches of LLM-assisted drafting, checked into `data.json` exactly like the original seed data — no runtime dependency, no live recipe-import API added. Full provenance (drafting constraints, the raw batches, and what was actually validated vs. spot-checked) is in [`scripts/recipe-generation/`](./scripts/recipe-generation/), and PLAN.md §3.31-§3.32 has the full account, including a real planning mistake caught along the way rather than glossed over.
- **The LLM feature grew a discovery mode, still grounded, still not a chatbot.** Beyond the per-recipe assistant, a Smart Recipe Finder on `/recipes` takes a natural-language query ("quick vegan dinners with chickpeas") and returns real recipes from the existing catalog — one query, one answer, no back-and-forth conversation. The model can only select from real recipe IDs; anything it invents is discarded server-side before the response is built, so the frontend never renders a model-supplied title or nutrition figure, only what's actually in `data.json`. A saved dietary profile is enforced the same hard way for the tags the dataset can actually earn (`vegan`/`vegetarian`/`gluten-free`): matches are checked against each recipe's real `dietary[]` array server-side, not just handed to the model as a prompt hint, so a vegan profile can't come back with a vegetarian-only result. `keto`/`high-protein` are deliberately left as soft prompt context instead of hard-enforced — the dataset's dietary derivation requires every ingredient in a recipe to individually carry a tag, which no real recipe currently satisfies for either, so hard-enforcing them would have silently zeroed out every Smart Finder result for anyone who saved that preference (caught by a Codex review, fixed). Full account, including how a Codex-drafted plan for this got independently reviewed and corrected before implementation, two rounds of Codex review afterward, and both real fixes that came out of them, in PLAN.md §3.33-§3.34 and §3.36.
- **Every recipe has a real photo, sourced offline like the dataset itself.** Downloaded once from Wikimedia Commons (openly licensed, real dish photography, not generated and not hotlinked at runtime) and checked into `frontend-app/public/images/recipes/`, shown as a detail-page hero and a card thumbnail. Each of the 32 photos was visually checked against its actual recipe (title *and* real ingredient list) before being accepted, not picked from search-result text alone — a real license-filter bug and several genuine photo/recipe mismatches were caught and fixed this way. Full provenance, including the mismatches that got rejected and why, in [`scripts/recipe-images/`](./scripts/recipe-images/) and PLAN.md §3.35.
- **Catalog recipes can be customized without touching the catalog.** "Customize recipe" creates a local editable copy under `/custom-recipes/...`, saves it in `localStorage`, and leaves the original `data.json` recipe unchanged. Custom recipes intentionally use free-text ingredients and do not claim computed nutrition/dietary tags or participate in shopping-list/favorites yet — those systems depend on backend-resolved ingredient IDs and gram conversions.

### Completed features

*Core (required):* recipe list with search/tag/ingredient filtering, recipe detail with joined ingredients/instructions/tags, server-computed nutrition (real per-ingredient unit conversion, not hardcoded numbers).

*Bonus, from the README's suggested list:* dietary-restriction filters (derived from ingredient data, not hand-tagged — see the vegan/vegetarian normalization note below), sorting (prep time/cook time/difficulty/calories, both directions), live recipe scaling by servings, a shopping-list generator that merges ingredients by identity (not display-name string matching) across multiple recipes, favoriting, and the LLM feature.

*Beyond the suggested list:* a persistent dietary/interest profile that auto-applies as your default filter state on a fresh visit; a difficulty filter; a proactive dietary-conflict banner on the recipe detail page; quick prompt chips on the recipe assistant ("Suggest substitutions," "Make it vegan," etc.); a Smart Recipe Finder on `/recipes` for natural-language discovery across the existing catalog, with its own discovery chips and a visible note whenever your saved dietary profile is being applied to results; a real photo on every recipe card and detail page; local custom copies of catalog recipes.

### Assumptions made

- **Ingredient nutrition values in the seed data are treated as per-100g.** The seed data doesn't state its basis explicitly; per-100g is the most common real-world convention and produces sane numbers against the recipes' actual serving sizes, but it's a documented assumption, not a verified fact about how the original data was authored.
- **No accounts** — see "Implementation choices," above.
- **Favoriting/shopping-list/profile are device-local**, not synced anywhere. Clearing browser storage clears them.
- **The 32-recipe/54-ingredient dataset (15 original + 17 added offline, see "Implementation choices") is the full catalog.** No live recipe-import API.

### Known limitations

- **No dedicated mobile filter drawer.** The filter rail is a fixed left column; it reflows into a stacked layout below ~900px, which works, but isn't a purpose-built mobile pattern. This was planned as its own iteration but deliberately skipped after deploy — once it was clear it meant phone-screen-specific UI work rather than a functional gap (loading/error/404/empty states and general responsiveness were already in place), it didn't seem worth the added time for this submission.
- **CORS on the backend is fully permissive** (`cors()` with no origin restriction) rather than locked to the deployed frontend's origin — a reasonable simplification for a take-home with two public-but-obscure URLs, not something I'd ship at a company handling real user data.
- **The LLM rate limiter is in-memory and per-process** — fine for this single-instance deploy, wouldn't hold up unmodified behind a horizontally-scaled backend.
- **The shopping list adds a recipe at its own base servings**, not whatever serving count you'd scaled it to on the detail page — a deliberate scope cut, not a bug (see PLAN.md §3.25).
- **The unmerged-ingredient path in the shopping list** (for a unit/ingredient combination with no conversion reference data) is implemented and unit-tested, but the current dataset (all 32 recipes) happens to have zero ingredient lines that actually hit it — so it's real but currently unexercised by the live data.
- **The Smart Finder sends the full recipe catalog as context on every query** (~3-3.5k tokens at the current 32-recipe size — trivial cost/latency for `gpt-4o-mini`). This is a deliberate "good enough for this dataset size" choice, not something that scales indefinitely; a meaningfully larger catalog would need a retrieval/narrowing step before the model call instead.
- **A handful of recipe photos are close-but-not-exact matches**, not the precise dish photographed — e.g. a whole roasted cauliflower rather than one sliced into "steaks," a beef-and-vegetable skillet without the sweet potato specifically visible. Commons doesn't have a free, correctly-licensed, visually-precise photo for every specific recipe in this dataset; every such case is listed explicitly in [`scripts/recipe-images/attribution.md`](./scripts/recipe-images/attribution.md) rather than silently presented as exact.
- **Custom recipes are local-only.** They persist after closing the browser on the same device/browser, but they are not synced across devices and are removed if site data is cleared. Custom recipes also do not yet support computed nutrition, dietary derivation, favorites, shopping-list merging, or the recipe-page LLM assistant.

### Additional features I'd add with more time

- A real mobile filter-drawer pass (Iteration 7 in PLAN.md — deliberately skipped rather than unreached; see "Known limitations," above).
- A further-expanded recipe dataset (32 recipes is a real improvement over the original 15, per Iteration 10 — see "Implementation choices" above — but there's no ceiling on how much richer this could get with more batches, or by importing from a real public recipe API instead of drafting synthetic ones).
- Real lightweight auth (email/magic-link) so favorites/profile/shopping-list could follow a person across devices instead of living in one browser's `localStorage`.
- Locking down the backend's CORS policy and adding a persistent (not in-memory) rate-limit store, if this were headed toward real production traffic rather than a take-home demo.
