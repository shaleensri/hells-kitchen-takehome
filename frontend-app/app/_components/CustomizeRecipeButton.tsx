"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { RecipeDetail } from "@hells-kitchen/shared";
import { useCustomRecipes } from "@/lib/customRecipes";

export function CustomizeRecipeButton({ recipe }: { recipe: RecipeDetail }) {
  const router = useRouter();
  const { createFromRecipe, hydrated } = useCustomRecipes();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    const custom = createFromRecipe(recipe);
    if (!custom) {
      setError("Could not create a custom copy of this recipe.");
      return;
    }
    setError(null);
    router.push(`/custom-recipes/${encodeURIComponent(custom.id)}/edit`);
  }

  return (
    <>
      <button type="button" className="btn btn-secondary" onClick={handleClick} disabled={!hydrated}>
        Customize recipe
      </button>
      {error && (
        <span role="alert" style={{ color: "var(--danger)", fontSize: 12 }}>
          {error}
        </span>
      )}
    </>
  );
}
