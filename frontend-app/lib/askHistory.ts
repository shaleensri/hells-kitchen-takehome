"use client";

/**
 * Per-recipe "Ask about this recipe" conversation persistence (PLAN.md
 * §3.29) — before this, the Q&A transcript was plain component state, so
 * navigating away from the recipe and back lost it entirely. Same
 * localStorage-per-key pattern already used by favorites/profile/shopping-
 * list (lib/favorites.ts, lib/profile.ts, lib/shoppingList.ts), keyed per
 * recipe id since a conversation about one recipe has no bearing on another.
 *
 * Deliberately simpler than those hooks: this transcript is only ever shown
 * in one place (this one panel, per recipe page), so there's no same-tab
 * cross-component reactivity to broadcast — no custom event needed.
 */
import { useCallback, useEffect, useState } from "react";
import { readLocalStorage, writeLocalStorage } from "./storage";

export interface Exchange {
  question: string;
  answer: string;
}

// Capped for two independent reasons: unbounded localStorage growth, and
// (separately, enforced again server-side in routes/recipes.ts) unbounded
// token cost — every stored exchange gets sent back to the model as context
// on the next question, so "how much do we remember" directly drives spend.
export const MAX_STORED_EXCHANGES = 12;

function keyFor(recipeId: string): string {
  return `hk:ask-history:${recipeId}`;
}

/** Pure — easy to unit test independent of localStorage/DOM. */
export function appendExchange(current: Exchange[], exchange: Exchange): Exchange[] {
  return [...current, exchange].slice(-MAX_STORED_EXCHANGES);
}

export function useAskHistory(recipeId: string) {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setExchanges(readLocalStorage<Exchange[]>(keyFor(recipeId), []));
    setHydrated(true);
  }, [recipeId]);

  const append = useCallback(
    (exchange: Exchange) => {
      setExchanges((prev) => {
        const next = appendExchange(prev, exchange);
        writeLocalStorage(keyFor(recipeId), next);
        return next;
      });
    },
    [recipeId]
  );

  const clear = useCallback(() => {
    writeLocalStorage(keyFor(recipeId), []);
    setExchanges([]);
  }, [recipeId]);

  return { exchanges, hydrated, append, clear };
}
