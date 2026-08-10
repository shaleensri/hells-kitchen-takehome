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
  app.use(cors());
  app.use(express.json());

  app.use("/api/recipes", createRecipesRouter(appData));
  app.use("/api/ingredients", createIngredientsRouter(appData));

  // Unmatched routes get the same error envelope as everything else (§3.10),
  // not Express's default HTML 404 page.
  app.use((req, _res, next) => {
    next(new NotFoundError(`No route for ${req.method} ${req.path}.`));
  });

  app.use(errorHandler);

  return app;
}
