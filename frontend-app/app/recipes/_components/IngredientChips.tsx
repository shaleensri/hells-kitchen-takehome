"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import styles from "./IngredientChips.module.css";

/**
 * The one piece of the filter rail that's a real client component — typing
 * an arbitrary ingredient and adding it as a removable chip isn't a fixed
 * small set like dietary/difficulty, so it can't be precomputed as links
 * the way the rest of the rail is (lib/filterUrl.ts).
 */
export function IngredientChips({ initial }: { initial: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draft, setDraft] = useState("");

  function commit(next: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.length > 0) {
      params.set("ingredients", next.join(","));
    } else {
      params.delete("ingredients");
    }
    router.push(`/recipes?${params.toString()}`);
  }

  function addChip() {
    const value = draft.trim();
    if (!value) return;
    if (!initial.some((v) => v.toLowerCase() === value.toLowerCase())) {
      commit([...initial, value]);
    }
    setDraft("");
  }

  function removeChip(value: string) {
    commit(initial.filter((v) => v !== value));
  }

  return (
    <div>
      <h6 className={styles.heading}>Ingredient</h6>
      <div className={styles.chipRow}>
        {initial.map((value) => (
          <button key={value} type="button" className={styles.chip} onClick={() => removeChip(value)}>
            {value} <span aria-hidden="true">&times;</span>
            <span className="visually-hidden">Remove {value} filter</span>
          </button>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addChip();
            }
          }}
          placeholder="+ add"
          className={styles.input}
          aria-label="Add ingredient filter"
        />
      </div>
    </div>
  );
}
