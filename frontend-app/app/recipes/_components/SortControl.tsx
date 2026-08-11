"use client";

import { useRouter, useSearchParams } from "next/navigation";
import styles from "./SortControl.module.css";

const OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Default" },
  { value: "prepTime:asc", label: "Prep time" },
  { value: "cookTime:asc", label: "Cook time" },
  { value: "difficulty:asc", label: "Difficulty" },
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
