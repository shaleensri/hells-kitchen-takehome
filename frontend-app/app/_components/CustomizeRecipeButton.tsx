"use client";

import { useRouter } from "next/navigation";
import type { RecipeDetail } from "@hells-kitchen/shared";
import { useCustomRecipes } from "@/lib/customRecipes";

export function CustomizeRecipeButton({ recipe }: { recipe: RecipeDetail }) {
  const router = useRouter();
  const { createFromRecipe, hydrated } = useCustomRecipes();

  function handleClick() {
    const custom = createFromRecipe(recipe);
    router.push(`/custom-recipes/${encodeURIComponent(custom.id)}/edit`);
  }

  return (
    <button type="button" className="btn btn-secondary" onClick={handleClick} disabled={!hydrated}>
      Customize recipe
    </button>
  );
}
