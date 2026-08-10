/**
 * data.json stores prepTime/cookTime as free text ("20 minutes", "0 minutes"),
 * not numbers — needed as numeric minutes for the calorie/prepTime/cookTime
 * sorting bonus feature (PLAN.md §4.2 item 2, §3.10 `sort` param).
 */
export function parseDurationMinutes(text: string): number | null {
  const match = text.trim().match(/(\d+(?:\.\d+)?)\s*(hour|hr|minute|min)/i);
  if (!match) return null;
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (!Number.isFinite(value)) return null;
  return unit.startsWith("h") ? value * 60 : value;
}
