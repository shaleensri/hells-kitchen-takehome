"use client";

import { useRouter, useSearchParams } from "next/navigation";
import styles from "./SortControl.module.css";

// Every field gets both directions — the backend supports order=desc on all
// four (verified directly against the API), so the UI should too. Missed
// initially: only calories had a low/high pair, prep/cook/difficulty each
// only exposed one direction, an inconsistency caught when the user asked
// whether Iteration 4 was really complete.
const OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Default" },
  { value: "prepTime:asc", label: "Prep time (fastest first)" },
  { value: "prepTime:desc", label: "Prep time (slowest first)" },
  { value: "cookTime:asc", label: "Cook time (fastest first)" },
  { value: "cookTime:desc", label: "Cook time (slowest first)" },
  { value: "difficulty:asc", label: "Difficulty (easiest first)" },
  { value: "difficulty:desc", label: "Difficulty (hardest first)" },
  { value: "calories:asc", label: "Calories (low first)" },
  { value: "calories:desc", label: "Calories (high first)" },
];

export function SortControl({ sort, order }: { sort?: string; order?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = sort ? `${sort}:${order ?? "asc"}` : "";

  return (
    <label className={styles.wrapper}>
      <span>Sort</span>
      <select
        className={styles.select}
        value={current}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString());
          const [nextSort, nextOrder] = e.target.value.split(":");
          if (nextSort) {
            params.set("sort", nextSort);
            params.set("order", nextOrder ?? "asc");
          } else {
            params.delete("sort");
            params.delete("order");
          }
          router.push(`/recipes?${params.toString()}`);
        }}
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
