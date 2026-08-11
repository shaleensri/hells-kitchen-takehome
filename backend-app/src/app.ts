/**
 * Express app factory — separated from server.ts (which just boots +
 * listens) so tests can exercise the app over HTTP (via supertest) without
 * binding a real port. Standard Express testing pattern.
 */
import cors from "cors";
import express, { type Express } from "express";
import type { AppData } from "./data";
import { createRecipesRouter } from "./routes/recipes";
import { createIngredientsRouter } from "./routes/ingredients";
import { errorHandler, NotFoundError } from "./errors";

export function createApp(appData: AppData): Express {
  const app = express();
  // Trust exactly one reverse-proxy hop (Railway's edge, §3.27's deploy) so
  // req.ip reflects the real client's X-Forwarded-For instead of the proxy's
  // own address. Without this, every visitor behind the same proxy collapses
  // into one req.ip — which the LLM endpoint's per-IP rate limiter
  // (rateLimit.ts, §3.11) keys on, silently turning a per-user limit into one
  // limit shared across everyone (Codex catch, confirmed via a diagnostic
  // test before this fix: req.ip was identical regardless of
  // X-Forwarded-For). `1` (not `true`) trusts only the nearest hop — the
  // right value for a single reverse proxy, not an arbitrary chain a client
  // could spoof further hops into.
  app.set("trust proxy", 1);
  app.use(cors());
  app.use(express.json());

  app.use("/api/recipes", createRecipesRouter(appData));
  app.use("/api/ingredients", createIngredientsRouter(appData));

  // Lets the frontend show the "Ask about this recipe" panel as disabled
  // up front (§3.3's fail-soft requirement) instead of only finding out the
  // key is missing after a user types a question and submits it.
  app.get("/api/llm-status", (_req, res) => {
    res.json({ available: Boolean(process.env.OPENAI_API_KEY) });
  });

  // Unmatched routes get the same error envelope as everything else (§3.10),
  // not Express's default HTML 404 page.
  app.use((req, _res, next) => {
    next(new NotFoundError(`No route for ${req.method} ${req.path}.`));
  });

  app.use(errorHandler);

  return app;
}
