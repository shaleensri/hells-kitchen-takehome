/**
 * One real photo per recipe — PLAN.md §3.35. Single source of truth for the
 * filename convention (`/images/recipes/{recipeId}.jpg`, served straight out
 * of `public/`) so RecipeImage.tsx and its regression test
 * (recipeImages.test.ts) can't drift apart from each other.
 */
export function recipeImageSrc(recipeId: string): string {
  return `/images/recipes/${recipeId}.jpg`;
}
