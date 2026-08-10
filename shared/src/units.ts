/**
 * The one unit-conversion module reused by nutrition calc (backend-app) and
 * shopping-list merging (frontend-app) — PLAN.md §4.3 "one system, two
 * problems" and §3.9 (the full reasoning + exact counts behind this file).
 *
 * Three tiers, in resolution order:
 *   1. Mass units (g, oz, lb)   → grams via a fixed, ingredient-independent factor.
 *   2. Volume units (cup, cups, tbsp, tsp, ml) → grams via a fixed volume→ml
 *      factor combined with a per-ingredient density (gramsPerCup). Volume-to-volume
 *      is universal; volume-to-MASS is not, hence the density lookup (§3.9).
 *   3. Count/descriptive units (medium, cloves, whole, ...) → grams via a
 *      per-(ingredient, unit) reference weight — there's no formula for these,
 *      only a lookup (§3.9).
 *
 * Anything not covered by one of these three tiers returns `grams: null` —
 * callers must not invent a number (§3.9's fallback contract).
 */

export type UnitTier = "mass" | "volume" | "count" | "unknown";

export interface GramsConversionResult {
  grams: number | null;
  /** True if `grams` came from an estimated reference weight/density, not a
   * fixed physical conversion factor. Real number, but an estimate (§3.9). */
  approximate: boolean;
  tier: UnitTier;
}

// ---------------------------------------------------------------------------
// Tier 1: mass units — universal, no ingredient-specific data needed.
// ---------------------------------------------------------------------------

const MASS_UNIT_TO_GRAMS: Record<string, number> = {
  g: 1,
  oz: 28.3495,
  lb: 453.592,
};

// ---------------------------------------------------------------------------
// Tier 2: volume units — universal volume→ml factor, then an ingredient
// density (grams per cup) is required to reach grams. 24 ingredients in the
// current dataset need one (PLAN.md §3.9); values are USDA-ish approximations,
// documented as such (open item in PLAN.md §8 — good enough for a take-home,
// not claimed to be lab-precise).
// ---------------------------------------------------------------------------

// tbsp/tsp are derived as exact fractions of a cup (1 cup = 16 tbsp = 48 tsp,
// true by definition in US customary units) rather than independently
// rounded from published ml figures — otherwise "1 cup" and "16 tbsp" of the
// same ingredient could disagree by a fraction of a gram due to rounding
// drift between two separately-sourced constants.
const ML_PER_CUP = 236.588;

const VOLUME_UNIT_TO_ML: Record<string, number> = {
  cup: ML_PER_CUP,
  cups: ML_PER_CUP,
  tbsp: ML_PER_CUP / 16,
  tsp: ML_PER_CUP / 48,
  ml: 1,
};

/** grams per US cup, per ingredientId. Covers every ingredient that appears
 * under a volume unit in the seed data (24 ingredients, §3.9). */
export const INGREDIENT_GRAMS_PER_CUP: Record<string, number> = {
  almonds: 143,
  brown_sugar: 220,
  butter: 227,
  cilantro: 16,
  granola: 100,
  greek_yogurt: 245,
  olive_oil: 216,
  parmesan: 100,
  quinoa: 170,
  white_sugar: 200,
  broccoli: 91,
  chocolate_chips: 170,
  flour: 125,
  kale: 67,
  mixed_berries: 150,
  sushi_rice: 195,
  tomato: 180,
  curry_powder: 96,
  ginger: 96,
  honey: 336,
  soy_sauce: 256,
  tahini: 240,
  black_pepper: 110,
  coconut_milk: 227,
};

// ---------------------------------------------------------------------------
// Tier 3: count/descriptive units — no formula, per-(ingredient, unit)
// reference weight in grams. 21 pairs in the current dataset (§3.9).
// ---------------------------------------------------------------------------

export const COUNT_UNIT_REFERENCE_WEIGHTS: Record<string, Record<string, number>> = {
  asparagus: { bunch: 450 },
  chickpeas: { can: 425 },
  garlic: { cloves: 3 },
  cauliflower: { head: 600 },
  cucumber: { large: 300, medium: 200 },
  eggs: { large: 50 },
  sweet_potato: { large: 200 },
  basil: { leaves: 0.5 },
  banana: { medium: 118 },
  bell_pepper: { medium: 120 },
  carrot: { medium: 61 },
  onion: { medium: 110 },
  potato: { medium: 170 },
  tomato: { medium: 123 },
  corn_tortillas: { pieces: 24 },
  nori: { sheets: 3 },
  red_onion: { small: 70 },
  avocado: { whole: 200 },
  lemon: { whole: 58 },
  lime: { whole: 44 },
};

// ---------------------------------------------------------------------------
// Amount parsing — data.json stores amounts as strings, sometimes simple
// fractions (e.g. "1/3" for olive oil in recipe 15).
// ---------------------------------------------------------------------------

export function parseAmount(amount: string): number | null {
  const trimmed = amount.trim();
  if (trimmed === "") return null;
  const fractionMatch = trimmed.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);
    if (denominator === 0) return null;
    return numerator / denominator;
  }
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Convert an (ingredientId, amount, unit) line to grams, per the three-tier
 * resolution order above. Never fabricates a number — returns grams: null
 * when nothing in the tables covers this combination (§3.9's fallback rule).
 */
export function convertToGrams(
  ingredientId: string,
  amount: string,
  unit: string
): GramsConversionResult {
  const parsedAmount = parseAmount(amount);
  const normalizedUnit = unit.trim().toLowerCase();

  if (parsedAmount === null) {
    return { grams: null, approximate: false, tier: "unknown" };
  }

  if (normalizedUnit in MASS_UNIT_TO_GRAMS) {
    return {
      grams: parsedAmount * MASS_UNIT_TO_GRAMS[normalizedUnit],
      approximate: false,
      tier: "mass",
    };
  }

  if (normalizedUnit in VOLUME_UNIT_TO_ML) {
    const gramsPerCup = INGREDIENT_GRAMS_PER_CUP[ingredientId];
    if (gramsPerCup === undefined) {
      return { grams: null, approximate: false, tier: "volume" };
    }
    const ml = parsedAmount * VOLUME_UNIT_TO_ML[normalizedUnit];
    const grams = (ml / ML_PER_CUP) * gramsPerCup;
    return { grams, approximate: true, tier: "volume" };
  }

  const countWeight = COUNT_UNIT_REFERENCE_WEIGHTS[ingredientId]?.[normalizedUnit];
  if (countWeight !== undefined) {
    return { grams: parsedAmount * countWeight, approximate: true, tier: "count" };
  }

  return { grams: null, approximate: false, tier: "unknown" };
}
