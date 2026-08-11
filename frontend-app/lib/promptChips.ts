/**
 * Prompt chips for the recipe-page "Ask about this recipe" panel — PLAN.md
 * §3.33 (Iteration 11). A plain content mapping, not real logic, but
 * extracted (rather than inlined in the component) so it's Vitest-testable
 * for shape validity, matching this project's habit of testing pure data
 * modules even when the "logic" is minimal.
 */

export interface PromptChip {
  label: string;
  question: string;
}

export const RECIPE_PROMPT_CHIPS: PromptChip[] = [
  { label: "Suggest substitutions", question: "Suggest a few practical ingredient substitutions for this recipe." },
  { label: "Make it vegan", question: "How can I make this recipe vegan while keeping it close to the original?" },
  {
    label: "Make it gluten-free",
    question: "How can I make this recipe gluten-free while keeping it close to the original?",
  },
  { label: "Prep-ahead tips", question: "What parts of this recipe can I prep ahead, and how should I store them?" },
  { label: "Serve with this", question: "What would you serve with this recipe to make it a complete meal?" },
  {
    label: "Higher protein",
    question: "How can I make this recipe higher in protein without changing it too much?",
  },
];
