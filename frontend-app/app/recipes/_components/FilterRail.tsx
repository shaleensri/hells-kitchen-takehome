import type { Difficulty, DietaryTag, RecipeListItem } from "@hells-kitchen/shared";
import Link from "next/link";
import { hrefWithParam, hrefWithToggledListValue, isListValueActive, type RawSearchParams } from "@/lib/filterUrl";
import { IngredientChips } from "./IngredientChips";
import styles from "./FilterRail.module.css";

const DIETARY_OPTIONS: DietaryTag[] = ["vegetarian", "vegan", "gluten-free", "keto", "high-protein"];
const DIFFICULTY_OPTIONS: Difficulty[] = ["easy", "medium", "hard"];
const TOP_TAGS_SHOWN = 8;

interface FilterRailProps {
  raw: RawSearchParams;
  allRecipes: RecipeListItem[];
  ingredients: string[];
  difficulty?: string;
}

function Checkbox({ active }: { active: boolean }) {
  return (
    <span className={`${styles.checkbox} ${active ? styles.checkboxActive : ""}`} aria-hidden="true">
      {active && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      )}
    </span>
  );
}

export function FilterRail({ raw, allRecipes, ingredients, difficulty }: FilterRailProps) {
  const dietaryCounts = Object.fromEntries(
    DIETARY_OPTIONS.map((tag) => [tag, allRecipes.filter((r) => r.dietary.includes(tag)).length])
  );

  const tagCounts = new Map<string, number>();
  for (const recipe of allRecipes) {
    for (const tag of recipe.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_TAGS_SHOWN);

  return (
    <aside className={styles.rail}>
      <div>
        <h6 className={styles.heading}>Dietary</h6>
        <div className={styles.optionList}>
          {DIETARY_OPTIONS.map((tag) => {
            const active = isListValueActive(raw, "dietary", tag);
            return (
              <Link key={tag} href={hrefWithToggledListValue(raw, "dietary", tag)} className={styles.option}>
                <Checkbox active={active} />
                {tag}
                <span className={styles.count}>{dietaryCounts[tag]}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {topTags.length > 0 && (
        <div>
          <h6 className={styles.heading}>Tags</h6>
          <div className={styles.optionList}>
            {topTags.map(([tag, count]) => {
              const active = isListValueActive(raw, "tags", tag);
              return (
                <Link key={tag} href={hrefWithToggledListValue(raw, "tags", tag)} className={styles.option}>
                  <Checkbox active={active} />
                  {tag}
                  <span className={styles.count}>{count}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h6 className={styles.heading}>Difficulty</h6>
        <div className={styles.segmented}>
          <Link
            href={hrefWithParam(raw, "difficulty", undefined)}
            className={`${styles.segment} ${!difficulty ? styles.segmentActive : ""}`}
          >
            All
          </Link>
          {DIFFICULTY_OPTIONS.map((level) => (
            <Link
              key={level}
              href={hrefWithParam(raw, "difficulty", level)}
              className={`${styles.segment} ${difficulty === level ? styles.segmentActive : ""}`}
            >
              {level === "medium" ? "Med" : level.charAt(0).toUpperCase() + level.slice(1)}
            </Link>
          ))}
        </div>
      </div>

      <IngredientChips initial={ingredients} />
    </aside>
  );
}
