/**
 * GET /api/ingredients — PLAN.md §3.10. Backs the frontend's ingredient-
 * filter autocomplete; deliberately a plain list-and-filter, not ranked
 * search. No pagination — 46-ingredient dataset, whole list every time.
 */
import { Router } from "express";
import type { AppData } from "../data";
import { toIngredientListItem } from "../data";

export function createIngredientsRouter(appData: AppData): Router {
  const router = Router();

  router.get("/", (req, res) => {
    const qRaw = req.query.q;
    const q = typeof qRaw === "string" ? qRaw.trim().toLowerCase() : undefined;

    const ingredients = [...appData.ingredientsById.values()]
      .filter((ingredient) => !q || ingredient.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(toIngredientListItem);

    res.json(ingredients);
  });

  return router;
}
