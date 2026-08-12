# Recipe Manager - Full Stack Take-Home Exercise

## Overview
Create a recipe management application that allows users to view, search, and organize recipes. This exercise tests your ability to build a full-stack web application with a focus on data relationships and user experience.

## Tips
- Use whatever frameworks/tools you're most comfortable with
- Focus on creating a working MVP before adding advanced features
- Be sure to document any assumptions or known limitations
- Test your application with different scenarios

## Setup Instructions

This repo is an npm workspaces monorepo (`shared`, `backend-app`, `frontend-app`) — install once from the repository root, not separately inside each app.

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

**Backend API:** https://hells-kitchen-backend-production.up.railway.app

### Setup instructions

Install once from the repository root:

```bash
npm install
```

Run locally:

```bash
npm run dev --workspace backend-app
npm run dev --workspace frontend-app
```

Optional environment variables:

- `backend-app/.env`: `OPENAI_API_KEY` enables the LLM features. Without it, the app still runs and shows a disabled assistant state.
- `frontend-app/.env.local`: `NEXT_PUBLIC_API_URL`, defaults to `http://localhost:8080` in local development.

Useful checks:

```bash
npm test
npm run typecheck --workspace backend-app
npm run typecheck --workspace frontend-app
npm run build --workspace frontend-app
```

### High-level implementation choices

- Converted the project into an npm workspaces monorepo with a shared TypeScript package for API/data types and unit conversion logic.
- Kept `data.json` as the mock database, but load and precompute data at backend startup instead of doing heavy work in the route handlers.
- The backend owns recipe filtering, sorting, ingredient resolution, dietary derivation, nutrition calculation, and LLM proxying.
- Nutrition and shopping-list merging use the same unit-conversion system: generic mass conversions, ingredient-specific volume densities, and count-unit reference weights.
- The frontend uses Next.js App Router with URL-driven search/filter/sort state, so filtered recipe views are refreshable and shareable.
- User-specific features are intentionally localStorage-based instead of account-based: saved recipes, shopping list, dietary profile, ask-history, and custom recipe drafts.
- The LLM features are grounded in existing app data. The recipe assistant receives the selected recipe context, and Smart Recipe Finder can only return real recipe IDs that the backend validates.
- Recipe data and photos were expanded offline and checked into the repo, avoiding live third-party recipe/photo API dependencies at runtime.

### Completed features

Core requirements:

- Recipe list page at `/recipes`
- Search by recipe title/description
- Filter by tags and ingredients
- Recipe detail page with resolved ingredients, instructions, tags, and calculated nutrition
- Ingredient endpoint for search/filter support

Bonus and additional features:

- Dietary filters for vegan, vegetarian, and gluten-free recipes
- Difficulty filter
- Sorting by prep time, cook time, difficulty, and calories
- Live recipe scaling by servings
- Shopping list generator that merges ingredients across selected recipes
- Saved/favorite recipes
- Local dietary/interest profile that can auto-apply filters
- Recipe-specific LLM assistant with prompt chips
- Smart Recipe Finder for natural-language catalog discovery
- Real recipe photos on cards and detail pages
- Local custom recipe copies with editable free-text ingredients/instructions
- Deployed frontend and backend
- TypeScript across backend, frontend, and shared package
- Automated tests for backend API behavior, filtering, nutrition, unit conversion, LLM guardrails, localStorage utilities, recipe images, and custom recipes

### Assumptions made

- Ingredient nutrition values are treated as per-100g.
- Unit conversion is approximate where needed, especially volume-to-grams and count units.
- If a quantity cannot be converted safely, the app avoids inventing precision: nutrition is marked partial, and shopping-list items are kept as unmerged lines instead of being dropped.
- Vegan recipes also count as vegetarian; vegetarian recipes do not count as vegan.
- Recipes with unresolved ingredient data are not allowed to satisfy dietary filters the app cannot verify.
- The catalog is static at runtime. New built-in recipes/photos are added offline and checked into the repo.
- Favorites, shopping list, profile, ask history, and custom recipes are stored only in the current browser.

### Known limitations

- No real authentication or cross-device sync.
- The backend uses permissive CORS for the take-home deployment.
- LLM rate limiting is in-memory and suited to this single-instance demo, not horizontal scaling.
- Shopping-list additions use a recipe's base serving count, not the currently scaled serving count on the detail page.
- Custom recipes do not yet participate in computed nutrition, dietary labels, favorites, shopping-list merging, image upload, or the recipe-page LLM assistant.
- Smart Recipe Finder sends the current 32-recipe catalog as context on each query. That is fine at this size, but a larger catalog should use a retrieval/narrowing step first.
- Some recipe photos are close visual matches rather than exact photos of the specific dish.

### Additional features I would add with more time

- Real auth with server-stored favorites, profiles, shopping lists, and custom recipes.
- A database-backed recipe editor for creating/publishing recipes beyond local drafts.
- Nutrition recomputation for custom recipes using structured ingredient selection.
- Mobile-specific filter drawer polish.
- More recipes and richer image attribution tooling.
- Persistent/distributed rate limiting and stricter production CORS.
