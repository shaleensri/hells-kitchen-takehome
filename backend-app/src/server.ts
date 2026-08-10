/**
 * Entry point. PLAN.md Iteration 1 scope is the foundation (data layer, unit
 * conversion, nutrition, seed validation) — full route coverage (filtering,
 * dietary/sort query params, error envelope, GET /api/ingredients) is
 * Iteration 2. This file boots the app and exposes a minimal /api/recipes so
 * `npm run dev` has something real to serve in the meantime.
 */
import cors from "cors";
import express from "express";
import { loadAppData, toRecipeListItem } from "./data";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const appData = loadAppData();
console.log(
  `[boot] Loaded ${appData.recipes.length} recipes, ${appData.ingredientsById.size} ingredients.`
);

// Placeholder route — replaced with the full §3.10 contract (search/tags/
// ingredients/dietary/sort query params, error envelope) in Iteration 2.
app.get("/api/recipes", (_req, res) => {
  res.json(appData.recipes.map(toRecipeListItem));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
