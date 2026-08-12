/**
 * Smart Recipe Finder — PLAN.md §3.33 (Iteration 11). Natural-language
 * discovery over the *existing* recipe catalog, not generation: the model
 * selects recipe IDs from a compact summary of what's already in
 * `data.json`, and every ID it returns is checked against the real
 * `recipesById` map before anything reaches the frontend — an ID the model
 * invents (or a stale/hallucinated one) is silently dropped, never trusted.
 *
 * Split into pure, DOM/network-free functions (catalog/prompt building,
 * response parsing, sanitizing) plus one orchestrator that actually calls
 * OpenAI via `callOpenAiChat` (llm.ts) — same split as the rest of this
 * project's pure-logic-vs-IO modules (nutrition.ts, dietary.ts, etc.),
 * chosen so the interesting logic here is Vitest-testable without a real
 * network call.
 */
import { callOpenAiChat, LlmProviderError, type ChatMessage } from "./llm";
import type { PrecomputedRecipe } from "./data";

// Deliberately boring, per Iteration 11's plan: no "importance" ranking for
// which ingredients count as "main" — just the first N in the order the
// recipe already stores them, same order the detail page itself displays.
export const MAX_MAIN_INGREDIENTS = 5;

// Caps how many recipes the model can recommend per query — keeps the
// "Smart matches" section from ever dwarfing the deterministic grid below it.
export const MAX_FINDER_MATCHES = 6;

/**
 * One line per recipe, built from data already precomputed at boot
 * (PrecomputedRecipe — nutrition, dietary[], resolved ingredients) rather
 * than re-deriving anything. ~90-110 tokens/recipe by rough count; at the
 * current 32-recipe catalog that's roughly 3-3.5k input tokens per query —
 * trivial for gpt-4o-mini's context window and cost. Documented scaling
 * assumption (PLAN.md §3.33): this "send the whole catalog" approach is
 * fine at this size, but would need retrieval/narrowing before calling the
 * model if the dataset grows much past a hundred or so recipes.
 */
export function buildCompactCatalog(recipes: PrecomputedRecipe[]): string {
  return recipes
    .map((p) => {
      const mainIngredients = p.resolvedIngredients
        .slice(0, MAX_MAIN_INGREDIENTS)
        .map((line) => line.name ?? line.ingredientId)
        .join(", ");

      return [
        `Recipe ${p.raw.id}: ${p.raw.title}`,
        `Description: ${p.raw.description}`,
        `Tags: ${p.raw.tags.join(", ") || "none"}`,
        `Dietary: ${p.dietary.join(", ") || "none confirmed"}`,
        `Difficulty: ${p.raw.difficulty}`,
        `Prep/Cook: ${p.raw.prepTime} / ${p.raw.cookTime}`,
        `Servings: ${p.raw.servings}`,
        `Nutrition: ${p.nutrition.perServing.calories} kcal, ${p.nutrition.perServing.protein}g protein per serving${p.nutrition.partial ? " (partial — some ingredients unresolved)" : ""}`,
        `Main ingredients: ${mainIngredients || "none listed"}`,
      ].join("\n");
    })
    .join("\n\n");
}

export function buildFinderSystemPrompt(catalog: string, dietaryProfile: string[] | undefined): string {
  let prompt = [
    `You are a recipe discovery assistant for this app. You help users find recipes from the catalog below — you never invent recipes.`,
    ``,
    `Rules:`,
    `- Recommend only recipes from the catalog below. Never invent recipe IDs, titles, ingredients, or recipes that aren't listed here.`,
    `- If nothing in the catalog is a good match, say so plainly in "summary" and suggest the closest available matches instead of inventing something new — an empty or near-empty "matches" list is fine and expected sometimes.`,
    `- Keep each match's "reason" to one concise sentence explaining why it fits the query.`,
    `- Respect any saved dietary restrictions listed below unless the user's query explicitly says otherwise.`,
    `- Return STRICT JSON only, matching exactly this shape, with no markdown fences or extra commentary: {"summary": string, "matches": [{"recipeId": string, "reason": string}]}`,
    `- Include at most ${MAX_FINDER_MATCHES} matches, and only recipe IDs that appear in the catalog below.`,
    ``,
    `Catalog:`,
    catalog,
  ].join("\n");

  if (dietaryProfile && dietaryProfile.length > 0) {
    prompt += `\n\nThe user has saved these dietary restrictions: ${dietaryProfile.join(", ")}.`;
  }

  return prompt;
}

export interface RawFinderMatch {
  recipeId: string;
  reason: string;
}

export interface RawFinderResponse {
  summary: string;
  matches: RawFinderMatch[];
}

function stripCodeFence(text: string): string {
  // response_format: json_object should prevent this, but models aren't
  // perfectly reliable — defensive fallback, not the primary mechanism.
  const match = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return match ? match[1].trim() : text;
}

/** Throws LlmProviderError (not a generic Error) on anything unusable — a
 * malformed/wrong-shaped model response is a provider-layer failure, same
 * category as an empty response in askAboutRecipe (llm.ts). */
export function parseFinderResponse(raw: string): RawFinderResponse {
  const text = stripCodeFence(raw.trim());

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new LlmProviderError("Recipe finder's response wasn't valid JSON.");
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).summary !== "string" ||
    !Array.isArray((parsed as Record<string, unknown>).matches)
  ) {
    throw new LlmProviderError("Recipe finder's response didn't match the expected shape.");
  }

  const record = parsed as { summary: string; matches: unknown[] };
  const matches = record.matches.filter((m): m is RawFinderMatch => {
    if (typeof m !== "object" || m === null) return false;
    const entry = m as Record<string, unknown>;
    return typeof entry.recipeId === "string" && typeof entry.reason === "string";
  });

  return { summary: record.summary, matches };
}

export interface SanitizedMatch {
  recipeId: string;
  reason: string;
}

/** The actual trust boundary: an ID the model returned that isn't in
 * `validIds` — invented, hallucinated, or stale — is dropped here, never
 * forwarded. Also dedupes (keeping the first/highest-ranked occurrence) and
 * caps at MAX_FINDER_MATCHES, in that order — capping before dedupe could
 * otherwise leave fewer than MAX_FINDER_MATCHES results even when enough
 * valid, unique ones existed further down the model's list. */
export function sanitizeMatches(rawMatches: RawFinderMatch[], validIds: ReadonlySet<string>): SanitizedMatch[] {
  const seen = new Set<string>();
  const result: SanitizedMatch[] = [];

  for (const match of rawMatches) {
    if (!validIds.has(match.recipeId)) continue;
    if (seen.has(match.recipeId)) continue;
    seen.add(match.recipeId);
    result.push(match);
    if (result.length >= MAX_FINDER_MATCHES) break;
  }

  return result;
}

export interface FilterByDietaryProfileResult {
  matches: SanitizedMatch[];
  limitedByProfile: boolean;
}

/**
 * Hard dietary filter, added after a live check found the soft version
 * wasn't enough (PLAN.md §3.33 follow-up review): sanitizeMatches only ever
 * enforced recipe *IDs* against real data — a saved dietary profile was
 * just a prompt instruction, and the model didn't always honor it (a
 * vegan-profile query came back with a vegetarian-only match). This closes
 * that for real: any match whose actual `dietary[]` doesn't cover every
 * *hard-filterable* saved tag is dropped here, unconditionally, using the
 * app's own precomputed dietary data — same "never trust the model, verify
 * against real data" posture as sanitizeMatches, just for dietary tags
 * instead of IDs. Filtering can legitimately zero out all matches; that's a
 * correct result, not an error — the caller surfaces it via
 * `limitedByProfile` rather than silently returning fewer results with no
 * explanation.
 *
 * Only `HARD_FILTERABLE_DIETARY_TAGS` are enforced this way — a real bug,
 * caught by a follow-up review (PLAN.md §3.36) and reproduced before being
 * fixed: `deriveDietaryTags` (dietary.ts) requires *every* ingredient in a
 * recipe to individually carry a tag, which real multi-ingredient dishes
 * can plausibly satisfy for vegan/vegetarian/gluten-free but almost never
 * for keto/high-protein (a chicken breast recipe that also calls for
 * breadcrumbs or rice fails that all-or-nothing test even though the dish
 * is reasonably high-protein). Across the current 32-recipe dataset, zero
 * recipes are ever tagged keto or high-protein — so hard-enforcing those
 * two the same way as the other three meant any user who saved either in
 * `/preferences` got zero Smart Finder results, for every query, forever,
 * with no error or explanation. keto/high-protein are still passed to the
 * model as soft prompt context (buildFinderSystemPrompt, below) — just
 * never used to hard-drop a match server-side.
 */
export const HARD_FILTERABLE_DIETARY_TAGS: ReadonlySet<string> = new Set(["vegan", "vegetarian", "gluten-free"]);

export function filterMatchesByDietaryProfile(
  matches: SanitizedMatch[],
  recipes: PrecomputedRecipe[],
  dietaryProfile: string[] | undefined
): FilterByDietaryProfileResult {
  const hardTags = (dietaryProfile ?? []).filter((tag) => HARD_FILTERABLE_DIETARY_TAGS.has(tag));
  if (hardTags.length === 0) {
    return { matches, limitedByProfile: false };
  }

  const dietaryById = new Map(recipes.map((p) => [p.raw.id, p.dietary as string[]]));
  const filtered = matches.filter((match) => {
    const dietary = dietaryById.get(match.recipeId) ?? [];
    return hardTags.every((tag) => dietary.includes(tag));
  });

  return { matches: filtered, limitedByProfile: filtered.length < matches.length };
}

export interface FindRecipesParams {
  recipes: PrecomputedRecipe[];
  query: string;
  dietaryProfile?: string[];
  apiKey: string;
  model?: string;
  /** Injectable for tests — defaults to the real global fetch. */
  fetchImpl?: typeof fetch;
}

export interface FindRecipesResult {
  summary: string;
  matches: SanitizedMatch[];
}

export async function findRecipesWithAssistant(params: FindRecipesParams): Promise<FindRecipesResult> {
  const catalog = buildCompactCatalog(params.recipes);
  const systemPrompt = buildFinderSystemPrompt(catalog, params.dietaryProfile);

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: params.query },
  ];

  const raw = await callOpenAiChat({
    messages,
    apiKey: params.apiKey,
    model: params.model,
    jsonMode: true,
    fetchImpl: params.fetchImpl,
  });

  const parsed = parseFinderResponse(raw);
  const validIds = new Set(params.recipes.map((p) => p.raw.id));
  const sanitized = sanitizeMatches(parsed.matches, validIds);
  const { matches, limitedByProfile } = filterMatchesByDietaryProfile(sanitized, params.recipes, params.dietaryProfile);

  const summary = limitedByProfile
    ? `${parsed.summary.trim()} Some catalog matches were narrowed further to fit your saved dietary preferences.`
    : parsed.summary;

  return { summary, matches };
}
