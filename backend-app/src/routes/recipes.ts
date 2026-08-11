/**
 * GET /api/recipes, GET /api/recipes/:id, POST /api/recipes/:id/ask — PLAN.md §3.10, §3.3, §3.11.
 */
import { Router } from "express";
import type { AppData } from "../data";
import { toRecipeDetail, toRecipeListItem } from "../data";
import { filterRecipes, parseRecipeQuery, sortRecipes } from "../filtering";
import { BadRequestError, NotFoundError, TooManyRequestsError, ServiceUnavailableError, BadGatewayError, GatewayTimeoutError } from "../errors";
import { askAboutRecipe, LlmProviderError, LlmTimeoutError, type HistoryExchange } from "../llm";
import { isRateLimited } from "../rateLimit";

// §3.11: reject anything over this before it ever reaches the LLM provider.
const MAX_QUESTION_LENGTH = 500;
// Prior-conversation context sent back to the model (§3.29 — without this,
// every question was answered with zero memory of earlier ones in the same
// session, despite the UI showing a running transcript). Capped independent
// of whatever the client sends: bounds token cost/latency per request, and
// means a malicious caller can't pad the history array to blow up spend
// even though the endpoint is already rate-limited.
const MAX_HISTORY_EXCHANGES = 5;
const MAX_HISTORY_ANSWER_LENGTH = 4000;

/** Loose on purpose — a malformed history entry is dropped, not a 400. This
 * is context for a better answer, not a required field; failing soft here
 * (matching §3.3's overall philosophy) beats rejecting the whole question
 * over a client-side history bug. */
function sanitizeHistory(raw: unknown): HistoryExchange[] {
  if (!Array.isArray(raw)) return [];
  const cleaned: HistoryExchange[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const { question, answer } = entry as Record<string, unknown>;
    if (typeof question !== "string" || typeof answer !== "string") continue;
    if (!question.trim() || !answer.trim()) continue;
    cleaned.push({
      question: question.slice(0, MAX_QUESTION_LENGTH),
      answer: answer.slice(0, MAX_HISTORY_ANSWER_LENGTH),
    });
  }
  return cleaned.slice(-MAX_HISTORY_EXCHANGES);
}

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
        // Namespaced with an "ask:" prefix (Iteration 11, §3.33) so heavy use
        // of the Smart Recipe Finder (routes/assistant.ts, its own "find:"
        // prefix) can never consume this endpoint's quota, or vice versa —
        // they're the same rate limiter module but genuinely separate buckets.
        const clientKey = `ask:${req.ip ?? "unknown"}`;
        if (isRateLimited(clientKey)) {
          throw new TooManyRequestsError("Too many questions — please wait a bit before asking again.");
        }

        const dietaryProfile = Array.isArray(req.body?.dietaryProfile)
          ? req.body.dietaryProfile.filter((t: unknown): t is string => typeof t === "string")
          : undefined;
        const history = sanitizeHistory(req.body?.history);

        const answer = await askAboutRecipe({
          recipe: toRecipeDetail(recipe),
          question,
          dietaryProfile,
          history,
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
