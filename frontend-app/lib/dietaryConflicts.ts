/**
 * Proactive conflict banner logic (PLAN.md §3.3's Iteration 6 enhancement,
 * §6's "Proactive conflict/substitution banner using the saved profile").
 * Deterministic and free — no LLM call needed: a recipe's confirmed `dietary[]`
 * tags (derived server-side, §3.2) either satisfy a saved restriction or they
 * don't. This only flags what the backend has *already* confirmed doesn't
 * match; it says nothing about ingredients the backend couldn't resolve.
 */
import type { DietaryTag } from "@hells-kitchen/shared";

export function getDietaryConflicts(profileDietary: DietaryTag[], recipeDietary: DietaryTag[]): DietaryTag[] {
  return profileDietary.filter((tag) => !recipeDietary.includes(tag));
}
