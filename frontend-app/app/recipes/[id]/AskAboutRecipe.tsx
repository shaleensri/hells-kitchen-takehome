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
 */
import { useEffect, useState } from "react";
import type { RecipeDetail } from "@hells-kitchen/shared";
import { ApiRequestError, askAboutRecipe, fetchLlmStatus } from "@/lib/api";
import { useProfile } from "@/lib/profile";
import { getDietaryConflicts } from "@/lib/dietaryConflicts";
import styles from "./AskAboutRecipe.module.css";

const MAX_QUESTION_LENGTH = 500;

interface Exchange {
  question: string;
  answer: string;
}

type Status = "checking" | "available" | "unavailable";

export function AskAboutRecipe({ recipe }: { recipe: RecipeDetail }) {
  const { profile, hydrated } = useProfile();
  const [status, setStatus] = useState<Status>("checking");
  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLlmStatus()
      .then((s) => setStatus(s.available ? "available" : "unavailable"))
      .catch(() => setStatus("unavailable"));
  }, []);

  const conflicts = hydrated ? getDietaryConflicts(profile.dietary, recipe.dietary) : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || loading) return;

    setLoading(true);
    setError(null);
    try {
      const { answer } = await askAboutRecipe(recipe.id, q, profile.dietary);
      setExchanges((prev) => [...prev, { question: q, answer }]);
      setQuestion("");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
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
              <ul className={styles.exchangeList}>
                {exchanges.map((ex, i) => (
                  <li key={i} className={styles.exchange}>
                    <p className={styles.question}>
                      <span className="label">You asked</span>
                      {ex.question}
                    </p>
                    <p className={styles.answer}>
                      <span className="label">Assistant</span>
                      {ex.answer}
                    </p>
                  </li>
                ))}
              </ul>
            )}

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
