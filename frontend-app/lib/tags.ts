/**
 * A recipe's raw `tags` (manually authored, e.g. "vegetarian") and its
 * derived `dietary` badges (computed, §3.2) can legitimately contain the
 * same word — the seed data manually tags Margherita Pizza "vegetarian"
 * AND it also derives to "vegetarian". Rendering both looks like a
 * duplicate-content bug even though the underlying data is correct, so the
 * plain tag list drops anything already shown as a dietary badge.
 */
export function dedupeTagsAgainstDietary(tags: string[], dietary: string[]): string[] {
  const dietarySet = new Set(dietary.map((d) => d.toLowerCase()));
  return tags.filter((tag) => !dietarySet.has(tag.toLowerCase()));
}
