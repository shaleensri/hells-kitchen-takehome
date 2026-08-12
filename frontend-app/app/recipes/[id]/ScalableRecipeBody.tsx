"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { RecipeDetail } from "@hells-kitchen/shared";
import { parseAmount } from "@hells-kitchen/shared";
import styles from "./page.module.css";

/**
 * Real recipe-scaling functionality (Iteration 4's feature, pulled forward
 * as part of the design-pass rebuild — PLAN.md §3.20). Pure client-side
 * math against data already in the RecipeDetail payload, no new backend
 * endpoint: ingredient amounts scale by (servings / baseServings); nutrition
 * per-serving values never change (a serving is a serving) — only the
 * "recipe total" line scales, since total = perServing × servings.
 *
 * `children` (§3.37 follow-up): the Nutrition card lives here because it
 * needs the live `servings` state for its "recipe total" line, but the
 * caller (page.tsx) wants it laid out side-by-side with AskAboutRecipe
 * rather than stacked above/below it — passing AskAboutRecipe in as a
 * child lets both sit in the same grid row without lifting servings state
 * up into the server-component page or prop-drilling it into a component
 * that doesn't need it.
 */

const MIN_SERVINGS = 1;
const MAX_SERVINGS = 24;

function formatAmount(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return String(rounded);
}

export function ScalableRecipeBody({ recipe, children }: { recipe: RecipeDetail; children?: ReactNode }) {
  const [servings, setServings] = useState(recipe.servings);
  const ratio = servings / recipe.servings;
  const { nutrition } = recipe;

  return (
    <>
      <div className={styles.columns}>
        <section aria-labelledby="ingredients-heading">
          <div className={styles.sectionHeader}>
            <h2 id="ingredients-heading">Ingredients</h2>
            <div className={styles.stepper}>
              <button
                type="button"
                onClick={() => setServings((s) => Math.max(MIN_SERVINGS, s - 1))}
                disabled={servings <= MIN_SERVINGS}
                aria-label="Decrease servings"
              >
                &minus;
              </button>
              <span className={styles.stepperValue}>
                {servings} {servings === 1 ? "serving" : "servings"}
              </span>
              <button
                type="button"
                onClick={() => setServings((s) => Math.min(MAX_SERVINGS, s + 1))}
                disabled={servings >= MAX_SERVINGS}
                aria-label="Increase servings"
              >
                +
              </button>
            </div>
          </div>
          <ul className={styles.ingredientList}>
            {recipe.ingredients.map((line, i) => {
              const baseAmount = parseAmount(line.amount);
              const displayAmount = baseAmount !== null ? formatAmount(baseAmount * ratio) : line.amount;
              return (
                <li key={`${line.ingredientId}-${i}`} className={styles.ingredientRow}>
                  <span className={styles.amount}>
                    {displayAmount} {line.unit}
                  </span>
                  <span>
                    {line.resolved ? line.name : `${line.ingredientId} (unknown ingredient)`}
                    {line.approximate && (
                      <span className={styles.approxBadge} title="Estimated unit conversion">
                        est.
                      </span>
                    )}
                    {!line.resolved && (
                      <span className={styles.unresolvedBadge} title="No ingredient data on file">
                        unresolved
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className={styles.scaleNote}>
            Quantities scale from the {recipe.servings}-serving base. Items marked EST. use an estimated
            volume-to-weight conversion.
          </p>
        </section>

        <section aria-labelledby="instructions-heading">
          <h2 id="instructions-heading">Method</h2>
          <ol className={styles.instructionList}>
            {recipe.instructions.map((step, i) => (
              <li key={i}>
                <span className={styles.stepNo}>{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </section>
      </div>

      <div className={styles.bottomRow}>
        <section aria-labelledby="nutrition-heading">
          <h2 id="nutrition-heading" className={styles.nutritionHeading}>
            Nutrition
          </h2>
          <div className={`blueprint ${styles.nutritionCard}`}>
            <i className="corner tl" />
            <i className="corner tr" />
            <i className="corner bl" />
            <i className="corner br" />
            {nutrition.partial && (
              <p className={styles.partialNote}>
                Some ingredients couldn&rsquo;t be fully resolved — these numbers may be incomplete.
              </p>
            )}
            <div className={styles.nutritionGrid}>
              <div>
                <div className="label">Calories</div>
                <div className={styles.nutritionValue}>{nutrition.perServing.calories}</div>
                <div className={`${styles.bar} ${styles.barPrimary}`} />
              </div>
              <div>
                <div className="label">Protein</div>
                <div className={styles.nutritionValue}>{nutrition.perServing.protein} g</div>
                <div className={styles.bar} style={{ width: "42%" }} />
              </div>
              <div>
                <div className="label">Carbs</div>
                <div className={styles.nutritionValue}>{nutrition.perServing.carbs} g</div>
                <div className={styles.bar} />
              </div>
              <div>
                <div className="label">Fat</div>
                <div className={styles.nutritionValue}>{nutrition.perServing.fat} g</div>
                <div className={styles.bar} style={{ width: "28%" }} />
              </div>
            </div>
            <p className={styles.totalNote}>
              Per serving. Recipe total at {servings} {servings === 1 ? "serving" : "servings"}:{" "}
              {formatAmount(nutrition.perServing.calories * servings)} kcal,{" "}
              {formatAmount(nutrition.perServing.protein * servings)}g protein,{" "}
              {formatAmount(nutrition.perServing.carbs * servings)}g carbs,{" "}
              {formatAmount(nutrition.perServing.fat * servings)}g fat.
            </p>
          </div>
        </section>

        {children}
      </div>
    </>
  );
}
