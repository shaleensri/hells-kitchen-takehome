/**
 * OpenAI proxy — PLAN.md §3.3, §3.11. The API key never leaves the backend;
 * the frontend only ever talks to POST /api/recipes/:id/ask (routes/recipes.ts),
 * never to OpenAI directly.
 *
 * The system prompt is grounded in the recipe's actual ingredients/
 * instructions/nutrition — nothing else — with an explicit instruction not
 * to invent details or answer unrelated questions, so this reads as "ask
 * about this specific recipe," not a generic chatbot bolted onto the page.
 */
import type { RecipeDetail } from "@hells-kitchen/shared";

// Pinned exact model string (§3.11's "resolve the open item in §8" —
// resolved here). Overridable via OPENAI_MODEL for the deploy step (§8) in
// case this specific string gets deprecated before Iteration 8 — but always
// resolved once at call time from a fixed source, never "whatever's latest"
// looked up per request.
export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const TIMEOUT_MS = 15_000;
const MAX_TOKENS = 500;

export class LlmProviderError extends Error {}
export class LlmTimeoutError extends Error {}

interface OpenAiChatResponse {
  choices?: { message?: { content?: string } }[];
}

function buildSystemPrompt(recipe: RecipeDetail, dietaryProfile: string[] | undefined): string {
  const ingredientLines = recipe.ingredients
    .map((line) => `- ${line.amount} ${line.unit} ${line.resolved ? line.name : `${line.ingredientId} (unrecognized ingredient)`}`)
    .join("\n");
  const instructionLines = recipe.instructions.map((step, i) => `${i + 1}. ${step}`).join("\n");

  let prompt = [
    `You are a cooking assistant answering questions about exactly one recipe: "${recipe.title}".`,
    `Base your answers on the exact ingredients/instructions/nutrition below — never claim the recipe already contains something it doesn't, or invent steps or nutrition numbers that aren't implied by it. Within that, you SHOULD give normal cooking help: suggest reasonable ingredient substitutions, answer "can I use X instead of Y" questions, and offer technique tips — that's expected and useful, not "inventing" the recipe. If asked something with no real connection to this recipe or cooking it, politely decline and steer back to the recipe.`,
    ``,
    `Serves: ${recipe.servings}`,
    `Difficulty: ${recipe.difficulty}`,
    `Tags: ${recipe.tags.join(", ") || "none"}`,
    `Dietary: ${recipe.dietary.join(", ") || "none confirmed"}`,
    ``,
    `Ingredients:`,
    ingredientLines,
    ``,
    `Instructions:`,
    instructionLines,
    ``,
    `Nutrition per serving: ${recipe.nutrition.perServing.calories} kcal, ${recipe.nutrition.perServing.protein}g protein, ${recipe.nutrition.perServing.carbs}g carbs, ${recipe.nutrition.perServing.fat}g fat.${recipe.nutrition.partial ? " (Some ingredients couldn't be fully resolved, so this may be incomplete.)" : ""}`,
  ].join("\n");

  if (dietaryProfile && dietaryProfile.length > 0) {
    prompt += `\n\nThe user has saved these dietary restrictions in their profile: ${dietaryProfile.join(", ")}. If any of this recipe's ingredients conflict with them, proactively say so and suggest a substitution, even if not directly asked.`;
  }

  return prompt;
}

export interface AskAboutRecipeParams {
  recipe: RecipeDetail;
  question: string;
  dietaryProfile?: string[];
  apiKey: string;
  model?: string;
  /** Injectable for tests — defaults to the real global fetch. */
  fetchImpl?: typeof fetch;
}

export async function askAboutRecipe(params: AskAboutRecipeParams): Promise<string> {
  const fetchImpl = params.fetchImpl ?? fetch;
  const model = params.model ?? process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetchImpl(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: buildSystemPrompt(params.recipe, params.dietaryProfile) },
          { role: "user", content: params.question },
        ],
        max_tokens: MAX_TOKENS,
        temperature: 0.4,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new LlmTimeoutError("The recipe assistant took too long to respond.");
    }
    throw new LlmProviderError("Could not reach the recipe assistant's provider.");
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new LlmProviderError(`Recipe assistant provider returned status ${res.status}.`);
  }

  const data = (await res.json()) as OpenAiChatResponse;
  const answer = data.choices?.[0]?.message?.content?.trim();
  if (!answer) {
    throw new LlmProviderError("Recipe assistant provider returned an empty response.");
  }
  return answer;
}
