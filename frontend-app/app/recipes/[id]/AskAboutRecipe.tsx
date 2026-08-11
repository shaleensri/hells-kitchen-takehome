"use client";

/**
 * "Ask about this recipe" panel — Iteration 6, PLAN.md §3.3/§3.11. Grounded
 * entirely in the recipe already loaded on this page (no extra fetch): the
 * backend proxy builds the system prompt from `recipe`'s real ingredients/
 * instructions/nutrition, never a generic chatbot.
 *
 * Fail-soft by design (§3.3): checks GET /api/llm-status on mount so a
 * missing OPENAI_API_KEY shows a clear disabled message up front, rather
 * than only surfacing after a user types a question and submits it.
 *
 * The dietary-conflict banner above the panel is a *separate*, free,
 * deterministic check (lib/dietaryConflicts.ts) — it doesn't call the LLM at
 * all, it just compares the saved profile against the recipe's already-
 * confirmed dietary[] tags. The LLM panel *additionally* receives the same
 * profile in its prompt (askAboutRecipe's dietaryProfile param) so its
 * answers can proactively mention conflicts/substitutions when relevant to
 * whatever's actually asked — the two are complementary, not duplicates.
 *
 * Two things fixed after direct user testing (§3.29), both real gaps the
 * first version had: the transcript now persists per-recipe in localStorage
 * (lib/askHistory.ts, same pattern as favorites/profile/shopping-list) so
 * navigating away and back doesn't lose it, and prior exchanges are now sent
 * back to the backend as conversation context on each new question — before
 * this, every question was answered with zero memory of earlier ones despite
 * the UI showing what looked like a running conversation.
 *
 * Prompt chips (Iteration 11, §3.33) submit through this exact same flow —
 * `submitQuestion` is a shared function taking the question text as an
 * explicit argument, not read from `question` state, specifically because
 * `setQuestion(chip.question)` immediately followed by calling a
 * state-reading submit function would submit the *stale* question (React
 * state updates aren't synchronous) — a real bug caught during planning,
 * not discovered by shipping it.
 */
import { useEffect, useState } from "react";
import type { RecipeDetail } from "@hells-kitchen/shared";
import { ApiRequestError, askAboutRecipe, fetchLlmStatus } from "@/lib/api";
import { useProfile } from "@/lib/profile";
import { getDietaryConflicts } from "@/lib/dietaryConflicts";
import { useAskHistory } from "@/lib/askHistory";
import { MarkdownLite } from "@/app/_components/MarkdownLite";
import { RECIPE_PROMPT_CHIPS } from "@/lib/promptChips";
import styles from "./AskAboutRecipe.module.css";

const MAX_QUESTION_LENGTH = 500;

type Status = "checking" | "available" | "unavailable";

export function AskAboutRecipe({ recipe }: { recipe: RecipeDetail }) {
  const { profile, hydrated } = useProfile();
  const { exchanges, append, clear } = useAskHistory(recipe.id);
  const [status, setStatus] = useState<Status>("checking");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLlmStatus()
      .then((s) => setStatus(s.available ? "available" : "unavailable"))
      .catch(() => setStatus("unavailable"));
  }, []);

  const conflicts = hydrated ? getDietaryConflicts(profile.dietary, recipe.dietary) : [];

  async function submitQuestion(text: string) {
    const q = text.trim();
    if (!q || loading) return;

    setLoading(true);
    setError(null);
    try {
      // Prior exchanges go along as conversation context — the backend caps
      // how much of this it actually forwards to the model (routes/recipes.ts),
      // so sending the full locally-stored transcript here is safe.
      const { answer } = await askAboutRecipe(recipe.id, q, profile.dietary, exchanges);
      append({ question: q, answer });
      setQuestion("");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submitQuestion(question);
  }

  function handleChipClick(chipQuestion: string) {
    void submitQuestion(chipQuestion);
  }

  return (
    <section className={styles.section} aria-labelledby="ask-heading">
      <h2 id="ask-heading" className={styles.heading}>
        Ask About This Recipe
      </h2>

      {conflicts.length > 0 && (
        <div className={styles.conflictBanner} role="note">
          Heads up — this recipe isn&rsquo;t confirmed {conflicts.join("/")}, which you&rsquo;ve saved as a
          preference. Ask below for substitution ideas.
        </div>
      )}

      <div className={`blueprint ${styles.panel}`}>
        <i className="corner tl" />
        <i className="corner tr" />
        <i className="corner bl" />
        <i className="corner br" />

        {status === "checking" && <p className={styles.note}>Checking availability…</p>}

        {status === "unavailable" && (
          <p className={styles.note}>
            The recipe assistant isn&rsquo;t configured on this server right now — this feature needs an OpenAI
            API key set server-side (PLAN.md §3.3).
          </p>
        )}

        {status === "available" && (
          <>
            {exchanges.length > 0 && (
              <>
                <div className={styles.exchangeListHeader}>
                  <button type="button" className={styles.clearBtn} onClick={clear}>
                    Clear conversation
                  </button>
                </div>
                <ul className={styles.exchangeList}>
                  {exchanges.map((ex, i) => (
                    <li key={i} className={styles.exchange}>
                      <p className={styles.question}>
                        <span className="label">You asked</span>
                        {ex.question}
                      </p>
                      {/* A <div>, not <p> — MarkdownLite renders its own block-level
                          elements (p/ul/ol), which a <p> parent can't legally contain. */}
                      <div className={styles.answer}>
                        <span className="label">Assistant</span>
                        <MarkdownLite text={ex.answer} />
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className={styles.chipRow}>
              {RECIPE_PROMPT_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  className={styles.chip}
                  onClick={() => handleChipClick(chip.question)}
                  disabled={loading}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                maxLength={MAX_QUESTION_LENGTH}
                placeholder={`e.g. "Can I substitute the olive oil?" or "Is this freezer-friendly?"`}
                disabled={loading}
                rows={2}
                className={styles.textarea}
                aria-label="Ask a question about this recipe"
              />
              <div className={styles.formFooter}>
                <span className={styles.counter}>
                  {question.length}/{MAX_QUESTION_LENGTH}
                </span>
                <button type="submit" className="btn btn-primary" disabled={loading || !question.trim()}>
                  {loading ? "Asking…" : "Ask"}
                </button>
              </div>
            </form>

            {error && <p className={styles.error}>{error}</p>}
          </>
        )}
      </div>
    </section>
  );
}
