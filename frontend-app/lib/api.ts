/**
 * API client — talks to the backend built in Iterations 1-2, per the
 * contract locked in PLAN.md §3.10. Uses @hells-kitchen/shared for response
 * types (single source of truth, §5.1) instead of duplicating interfaces.
 */
import type {
  ApiErrorBody,
  Difficulty,
  IngredientListItem,
  RecipeDetail,
  RecipeListItem,
  SortField,
  SortOrder,
} from "@hells-kitchen/shared";

/** Same-origin default assumes the browser can reach the backend directly at
 * this URL — fine for local dev and a simple two-service deploy (Iteration
 * 8). No secrets live here; recipes/ingredients are public read-only data,
 * unlike the LLM proxy's API key (§3.3), which stays server-side only. */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export class ApiRequestError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

async function apiFetch<T>(path: string, params?: Record<string, string | undefined>): Promise<T> {
  const url = new URL(path, API_BASE_URL);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, value);
      }
    }
  }

  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    throw new ApiRequestError(0, "NETWORK_ERROR", "Could not reach the recipe server.");
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiRequestError(
      res.status,
      body?.error?.code ?? "UNKNOWN_ERROR",
      body?.error?.message ?? `Request failed with status ${res.status}.`
    );
  }

  return res.json() as Promise<T>;
}

export interface RecipeListParams {
  q?: string;
  tags?: string[];
  ingredients?: string[];
  dietary?: string[];
  difficulty?: Difficulty;
  sort?: SortField;
  order?: SortOrder;
}

/** Joins a filter array into the comma-separated format the backend expects (§3.10). */
function joinList(values: string[] | undefined): string | undefined {
  return values && values.length > 0 ? values.join(",") : undefined;
}

export function fetchRecipes(params: RecipeListParams = {}): Promise<RecipeListItem[]> {
  return apiFetch<RecipeListItem[]>("/api/recipes", {
    q: params.q,
    tags: joinList(params.tags),
    ingredients: joinList(params.ingredients),
    dietary: joinList(params.dietary),
    difficulty: params.difficulty,
    sort: params.sort,
    order: params.order,
  });
}

export function fetchRecipe(id: string): Promise<RecipeDetail> {
  return apiFetch<RecipeDetail>(`/api/recipes/${encodeURIComponent(id)}`);
}

export function fetchIngredients(params: { q?: string } = {}): Promise<IngredientListItem[]> {
  return apiFetch<IngredientListItem[]>("/api/ingredients", { q: params.q });
}
