"use client";

/**
 * Dietary/interest profile editor (PLAN.md §3.1, §4.3, Iteration 5). Saves
 * instantly on click (localStorage, no separate "Save" step — same instant
 * pattern as favoriting), and is auto-applied as the default `dietary`
 * filter on a fresh /recipes visit (see ProfileAutoApply.tsx).
 */
import type { DietaryTag } from "@hells-kitchen/shared";
import { useProfile } from "@/lib/profile";
import styles from "./page.module.css";

const DIETARY_OPTIONS: DietaryTag[] = ["vegetarian", "vegan", "gluten-free", "keto", "high-protein"];

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

export function PreferencesPanel() {
  const { profile, hydrated, toggleDietary } = useProfile();

  return (
    <div className={`container ${styles.page}`}>
      <div className="eyebrow">Preferences</div>
      <h1 className={styles.heading}>Your Preferences</h1>
      <p className={styles.description}>
        Saved on this device only — there are no accounts (PLAN.md §3.1). Set your dietary restrictions once and
        they&rsquo;ll automatically be applied as filters the next time you land fresh on the recipe index.
      </p>

      <div className={`blueprint ${styles.card}`}>
        <i className="corner tl" />
        <i className="corner tr" />
        <i className="corner bl" />
        <i className="corner br" />
        <h2 className={styles.cardHeading}>Dietary restrictions</h2>
        <div className={styles.optionList}>
          {DIETARY_OPTIONS.map((tag) => {
            const active = profile.dietary.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                className={styles.option}
                onClick={() => toggleDietary(tag)}
                disabled={!hydrated}
                aria-pressed={active}
              >
                <Checkbox active={active} />
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      <p className={styles.note}>
        {profile.dietary.length > 0
          ? `Currently saved: ${profile.dietary.join(", ")}. This will auto-apply next time you open a fresh Recipe Index link.`
          : "No restrictions saved yet — the recipe index shows everything by default."}
      </p>
    </div>
  );
}
