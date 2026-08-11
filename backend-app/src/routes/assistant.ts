/**
 * POST /api/assistant/find-recipes — the Smart Recipe Finder's backend
 * (PLAN.md §3.33, Iteration 11). Separate resource/router from
 * routes/recipes.ts's POST /:id/ask on purpose — different job (discovery
 * across the catalog vs. Q&A about one recipe), and a separate rate-limit
 * namespace (see the "find:" prefix below) so the two features can never
 * exhaust each other's quota.
 *
 * No dedicated status endpoint for this feature (the addendum to the
 * Iteration 11 plan: "don't overbuild — a graceful error message is
 * enough") — the frontend reuses the existing GET /api/llm-status, which
 * already reflects the same OPENAI_API_KEY check both features depend on.
 */
import { Router } from "express";
import type { AppData } from "../data";
import { toRecipeListItem } from "../data";
import {
  BadRequestError,
  ServiceUnavailableError,
  TooManyRequestsError,
  BadGatewayError,
  GatewayTimeoutError,
} from "../errors";
import { findRecipesWithAssistant } from "../recipeFinder";
import { LlmProviderError, LlmTimeoutError } from "../llm";
import { isRateLimited } from "../rateLimit";

// Same cap as the recipe-page assistant's question length (§3.11) — no
// reason for a natural-language discovery query to need to be longer.
const MAX_QUERY_LENGTH = 500;

export function createAssistantRouter(appData: AppData): Router {
  const router = Router();

  // Async handler — Express 4 doesn't auto-forward rejected promises to the
  // error middleware (see routes/recipes.ts's identical comment).
  router.post("/find-recipes", (req, res, next) => {
    void (async () => {
      try {
        const query = typeof req.body?.query === "string" ? req.body.query.trim() : "";
        if (!query) {
          throw new BadRequestError("A query is required.");
        }
        if (query.length > MAX_QUERY_LENGTH) {
          throw new BadRequestError(`Query must be ${MAX_QUERY_LENGTH} characters or fewer.`);
        }

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          throw new ServiceUnavailableError("The recipe finder isn't configured on this server.");
        }

        // "find:" prefix — a genuinely separate bucket from routes/recipes.ts's
        // "ask:" prefix, both backed by the same rateLimit.ts module.
        const clientKey = `find:${req.ip ?? "unknown"}`;
        if (isRateLimited(clientKey)) {
          throw new TooManyRequestsError("Too many searches — please wait a bit before trying again.");
        }

        const dietaryProfile = Array.isArray(req.body?.dietaryProfile)
          ? req.body.dietaryProfile.filter((t: unknown): t is string => typeof t === "string")
          : undefined;

        const { summary, matches } = await findRecipesWithAssistant({
          recipes: appData.recipes,
          query,
          dietaryProfile,
          apiKey,
        });

        // Join each (already-validated-against-recipesById) match back to
        // real recipe data — the frontend never sees a model-supplied
        // title/nutrition/tag, only what's actually in data.json.
        const joined = matches.flatMap((match) => {
          const recipe = appData.recipesById.get(match.recipeId);
          return recipe ? [{ recipe: toRecipeListItem(recipe), reason: match.reason }] : [];
        });

        res.json({ summary, matches: joined });
      } catch (err) {
        if (err instanceof LlmTimeoutError) {
          next(new GatewayTimeoutError(err.message));
        } else if (err instanceof LlmProviderError) {
          next(new BadGatewayError(err.message));
        } else {
          next(err);
        }
      }
    })();
  });

  return router;
}
