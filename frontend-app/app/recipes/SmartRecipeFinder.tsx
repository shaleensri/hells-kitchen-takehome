"use client";

/**
 * Smart Recipe Finder — PLAN.md §3.33, Iteration 11. Natural-language
 * discovery over the *existing* catalog, deliberately not a chatbot: one
 * query in, a short summary + a handful of real recipe cards out, no
 * back-and-forth conversation, no session memory. "Help me choose from the
 * existing catalog," not "help me with this recipe" (that's the separate
 * per-recipe assistant, AskAboutRecipe.tsx).
 *
 * Sits above the deterministic filter rail + grid on /recipes and never
 * replaces them — this is a second, LLM-assisted way to arrive at the same
 * real recipe pages, not a replacement for the real filters. Deliberately
 * no URL state (plan's own call): this is discovery, not a bookmarkable
 * filter, so plain component state that resets on navigation is fine.
 *
 * Fail-soft the same way as the recipe-page assistant: checks the existing
 * GET /api/llm-status on mount rather than a separate status endpoint for
 * this feature (the plan's explicit "don't overbuild" addendum) — both
 * features are gated by the exact same OPENAI_API_KEY, so one status check
 * already tells the truth for both.
 *
 * The saved dietary profile is sent along with every query, but never
 * silently — a visible note tells the user it's being applied (matching
 * how the rest of this app treats profile-driven behavior, e.g. the
 * dietary-conflict banner: shown, never a silent filter).
 */
import { useEffect, useState } from "react";
import type { RecipeListItem } from "@hells-kitchen/shared";
import { ApiRequestError, fetchLlmStatus, findRecipesWithAssistant } from "@/lib/api";
import { useProfile } from "@/lib/profile";
import { FINDER_DISCOVERY_CHIPS } from "@/lib/finderChips";
import { RecipeCard } from "./_components/RecipeCard";
import styles from "./SmartRecipeFinder.module.css";

const MAX_QUERY_LENGTH = 500;

type Status = "checking" | "available" | "unavailable";

interface Match {
  recipe: RecipeListItem;
  reason: string;
}

export function SmartRecipeFinder() {
  const { profile, hydrated } = useProfile();
  const [status, setStatus] = useState<Status>("checking");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ summary: string; matches: Match[] } | null>(null);

  useEffect(() => {
    fetchLlmStatus()
      .then((s) => setStatus(s.available ? "available" : "unavailable"))
      .catch(() => setStatus("unavailable"));
  }, []);

  async function submitQuery(text: string) {
    const q = text.trim();
    if (!q || loading) return;

    setLoading(true);
    setError(null);
    try {
      const { summary, matches } = await findRecipesWithAssistant(q, profile.dietary);
      setResult({ summary, matches });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submitQuery(query);
  }

  function handleChipClick(chipQuery: string) {
    setQuery(chipQuery);
    void submitQuery(chipQuery);
  }

  return (
    <section className={styles.section} aria-labelledby="finder-heading">
      <div className={`blueprint ${styles.panel}`}>
        <i className="corner tl" />
        <i className="corner tr" />
        <i className="corner bl" />
        <i className="corner br" />

        <h2 id="finder-heading" className={styles.heading}>
          Smart Recipe Finder
        </h2>
        <p className={styles.helperCopy}>
          Tell the kitchen what you&rsquo;re craving. It searches the existing recipe catalog — no new recipes
          invented.
        </p>

        {status === "checking" && <p className={styles.note}>Checking availability…</p>}

        {status === "unavailable" && (
          <p className={styles.note}>
            The recipe finder isn&rsquo;t configured on this server right now — this feature needs an OpenAI API
            key set server-side (PLAN.md §3.3), same as the per-recipe assistant.
          </p>
        )}

        {status === "available" && (
          <>
            {hydrated && profile.dietary.length > 0 && (
              <p className={styles.profileNote} role="note">
                Using your saved dietary preferences: {profile.dietary.join(", ")}.
              </p>
            )}

            <div className={styles.chipRow}>
              {FINDER_DISCOVERY_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  className={styles.chip}
                  onClick={() => handleChipClick(chip.query)}
                  disabled={loading}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                maxLength={MAX_QUERY_LENGTH}
                placeholder={`e.g. "quick vegetarian dinners with chickpeas" or "cozy meals under 30 minutes"`}
                disabled={loading}
                className={styles.input}
                aria-label="Describe what you're craving"
              />
              <button type="submit" className="btn btn-primary" disabled={loading || !query.trim()}>
                {loading ? "Searching…" : "Find recipes"}
              </button>
            </form>

            {error && <p className={styles.error}>{error}</p>}

            {result && (
              <div className={styles.results}>
                <p className={styles.summary}>{result.summary}</p>
                {result.matches.length > 0 && (
                  <div className={styles.matchGrid}>
                    {result.matches.map((match) => (
                      <div key={match.recipe.id} className={styles.matchCard}>
                        <RecipeCard recipe={match.recipe} />
                        <p className={styles.reason}>{match.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
