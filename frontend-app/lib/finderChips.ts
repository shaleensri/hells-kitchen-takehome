/**
 * Discovery chips for the Smart Recipe Finder (PLAN.md §3.33, Iteration 11)
 * — each maps to a natural-language query, same free-text field a typed
 * query goes through, not a separate code path.
 */

export interface FinderChip {
  label: string;
  query: string;
}

export const FINDER_DISCOVERY_CHIPS: FinderChip[] = [
  { label: "Quick dinners", query: "quick dinners" },
  { label: "High-protein meals", query: "high-protein meals" },
  { label: "Vegan options", query: "vegan options" },
  { label: "Meal prep lunches", query: "meal prep lunches that reuse ingredients" },
  { label: "Recipes that reuse ingredients", query: "recipes that reuse common ingredients across the catalog" },
  { label: "No seafood", query: "recipes without seafood" },
  { label: "Something cozy", query: "something cozy and comforting" },
];
