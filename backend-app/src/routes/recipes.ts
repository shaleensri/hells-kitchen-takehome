/**
 * GET /api/recipes, GET /api/recipes/:id, POST /api/recipes/:id/ask — PLAN.md §3.10, §3.3, §3.11.
 */
import { Router } from "express";
import type { AppData } from "../data";
import { toRecipeDetail, toRecipeListItem } from "../data";
import { filterRecipes, parseRecipeQuery, sortRecipes } from "../filtering";
import { BadRequestError, NotFoundError, TooManyRequestsError, ServiceUnavailableError, BadGatewayError, GatewayTimeoutError } from "../errors";
import { askAboutRecipe, LlmProviderError, LlmTimeoutError } from "../llm";
import { isRateLimited } from "../rateLimit";

// §3.11: reject anything over this before it ever reaches the LLM provider.
const MAX_QUESTION_LENGTH = 500;

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

  // Async handler — Express 4 (unlike 5) does NOT auto-forward rejected
  // promises to the error middleware, so this needs its own try/catch that
  // calls next(err) explicitly (see errors.ts's comment on the sync case).
  router.post("/:id/ask", (req, res, next) => {
    void (async () => {
      try {
        const recipe = appData.recipesById.get(req.params.id);
        if (!recipe) {
          throw new NotFoundError(`No recipe with id "${req.params.id}".`);
        }

        const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
        if (!question) {
          throw new BadRequestError("A question is required.");
        }
        if (question.length > MAX_QUESTION_LENGTH) {
          throw new BadRequestError(`Question must be ${MAX_QUESTION_LENGTH} characters or fewer.`);
        }

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          throw new ServiceUnavailableError("The recipe assistant isn't configured on this server.");
        }

        // req.ip requires `trust proxy` to be set correctly behind a real
        // deploy's reverse proxy (Iteration 8) — falls back to a shared
        // bucket key if unavailable rather than throwing, since a slightly
        // coarser rate limit is a fine degradation, an unhandled crash isn't.
        const clientKey = req.ip ?? "unknown";
        if (isRateLimited(clientKey)) {
          throw new TooManyRequestsError("Too many questions — please wait a bit before asking again.");
        }

        const dietaryProfile = Array.isArray(req.body?.dietaryProfile)
          ? req.body.dietaryProfile.filter((t: unknown): t is string => typeof t === "string")
          : undefined;

        const answer = await askAboutRecipe({
          recipe: toRecipeDetail(recipe),
          question,
          dietaryProfile,
          apiKey,
        });

        res.json({ answer });
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
