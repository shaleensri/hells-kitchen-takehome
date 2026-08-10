/**
 * GET /api/recipes, GET /api/recipes/:id — PLAN.md §3.10.
 */
import { Router } from "express";
import type { AppData } from "../data";
import { toRecipeDetail, toRecipeListItem } from "../data";
import { filterRecipes, parseRecipeQuery, sortRecipes } from "../filtering";
import { NotFoundError } from "../errors";

export function createRecipesRouter(appData: AppData): Router {
  const router = Router();

  router.get("/", (req, res) => {
    // Synchronous throws (e.g. BadRequestError from an invalid sort/order)
    // are caught by Express 4's default error handling and routed to the
    // errorHandler middleware registered in app.ts — no try/catch needed here.
    const params = parseRecipeQuery(req.query as Record<string, unknown>);
    const filtered = filterRecipes(appData.recipes, params);
    const sorted = sortRecipes(filtered, params.sort, params.order);
    res.json(sorted.map(toRecipeListItem));
  });

  router.get("/:id", (req, res) => {
    const recipe = appData.recipesById.get(req.params.id);
    if (!recipe) {
      throw new NotFoundError(`No recipe with id "${req.params.id}".`);
    }
    res.json(toRecipeDetail(recipe));
  });

  return router;
}
