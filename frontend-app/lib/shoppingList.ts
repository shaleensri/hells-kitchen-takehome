"use client";

/**
 * Shopping list generator (PLAN.md §4.3, §3.9, §5.3, Iteration 5).
 *
 * Storage: which recipes are on the list lives in localStorage as
 * {recipeId, servings}[] — servings is captured at add-time (the card grid
 * adds at the recipe's base servings; nothing in this app currently offers
 * adding at a scaled count, so this field is always the base servings today,
 * kept as its own field rather than hardcoded so a future "add at N
 * servings" control has somewhere to write). Aggregation itself is pure and
 * storage-free (`buildShoppingList`) so it's unit-testable without a DOM.
 *
 * Merge rule (§3.9, corrected there after an earlier draft got it wrong):
 * merge by `ingredientId`, never by display name. Two lines are mergeable
 * only if *both* already resolved to a gram figure — which the backend only
 * produces when the unit was actually convertible to mass for that specific
 * ingredient (§3.9's three-tier system). So "mergeable" is just "line.grams
 * is not null" on both sides; nothing here re-derives unit conversion, it
 * reuses what /api/recipes/:id already computed. A line that couldn't be
 * resolved to grams (unknown ingredient, or a unit with no reference weight
 * for that ingredient, e.g. "to taste") is never dropped — it stays on the
 * list as its own unmerged, clearly-attributed line (§3.9's shopping-list
 * correction: losing an ingredient off the list is a real functional bug,
 * unlike an omitted nutrition number).
 */
import { useCallback, useEffect, useState } from "react";
import type { RecipeDetail } from "@hells-kitchen/shared";
import { readLocalStorage, writeLocalStorage } from "./storage";

export interface ShoppingListEntry {
  recipeId: string;
  servings: number;
}

export interface MergedLine {
  ingredientId: string;
  name: string;
  grams: number;
  sources: { recipeId: string; recipeTitle: string }[];
}

export interface UnmergedLine {
  key: string;
  recipeId: string;
  recipeTitle: string;
  ingredientId: string;
  name: string;
  amount: string;
  unit: string;
  resolved: boolean;
}

export interface ShoppingList {
  merged: MergedLine[];
  unmerged: UnmergedLine[];
}

/** 1 kg cutover keeps small amounts legible ("140g") without ever showing a
 * four-digit gram figure for pantry staples bought in bulk ("2.4kg flour"). */
export function formatGrams(grams: number): string {
  const rounded = Math.round(grams);
  if (rounded >= 1000) {
    return `${(rounded / 1000).toFixed(rounded % 1000 === 0 ? 0 : 1)}kg`;
  }
  return `${rounded}g`;
}

export function buildShoppingList(entries: { recipe: RecipeDetail; servings: number }[]): ShoppingList {
  const mergedByIngredient = new Map<string, MergedLine>();
  const unmerged: UnmergedLine[] = [];

  for (const { recipe, servings } of entries) {
    const multiplier = recipe.servings > 0 ? servings / recipe.servings : 1;

    recipe.ingredients.forEach((line, i) => {
      if (line.resolved && line.grams !== null) {
        const grams = line.grams * multiplier;
        const existing = mergedByIngredient.get(line.ingredientId);
        if (existing) {
          existing.grams += grams;
          existing.sources.push({ recipeId: recipe.id, recipeTitle: recipe.title });
        } else {
          mergedByIngredient.set(line.ingredientId, {
            ingredientId: line.ingredientId,
            name: line.name ?? line.ingredientId,
            grams,
            sources: [{ recipeId: recipe.id, recipeTitle: recipe.title }],
          });
        }
      } else {
        unmerged.push({
          key: `${recipe.id}-${line.ingredientId}-${i}`,
          recipeId: recipe.id,
          recipeTitle: recipe.title,
          ingredientId: line.ingredientId,
          name: line.resolved ? (line.name ?? line.ingredientId) : `${line.ingredientId} (unknown ingredient)`,
          amount: line.amount,
          unit: line.unit,
          resolved: line.resolved,
        });
      }
    });
  }

  const merged = [...mergedByIngredient.values()].sort((a, b) => a.name.localeCompare(b.name));
  unmerged.sort((a, b) => a.name.localeCompare(b.name));
  return { merged, unmerged };
}

const LIST_KEY = "hk:shopping-list";
const LIST_EVENT = "hk:shopping-list-changed";

export function getListEntries(): ShoppingListEntry[] {
  return readLocalStorage<ShoppingListEntry[]>(LIST_KEY, []);
}

function setListEntries(entries: ShoppingListEntry[]): void {
  writeLocalStorage(LIST_KEY, entries);
  window.dispatchEvent(new Event(LIST_EVENT));
}

export function isOnList(recipeId: string): boolean {
  return getListEntries().some((e) => e.recipeId === recipeId);
}

/** Adds the recipe (at the given base servings) if absent, removes it if
 * already present — mirrors the favorite-star toggle interaction. */
export function toggleOnList(recipeId: string, servings: number): ShoppingListEntry[] {
  const current = getListEntries();
  const next = current.some((e) => e.recipeId === recipeId)
    ? current.filter((e) => e.recipeId !== recipeId)
    : [...current, { recipeId, servings }];
  setListEntries(next);
  return next;
}

export function removeFromList(recipeId: string): ShoppingListEntry[] {
  const next = getListEntries().filter((e) => e.recipeId !== recipeId);
  setListEntries(next);
  return next;
}

export function clearList(): void {
  setListEntries([]);
}

export function useShoppingListEntries() {
  const [entries, setEntries] = useState<ShoppingListEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setEntries(getListEntries());
    setHydrated(true);
    const onChange = () => setEntries(getListEntries());
    window.addEventListener(LIST_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(LIST_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const toggle = useCallback((recipeId: string, servings: number) => setEntries(toggleOnList(recipeId, servings)), []);
  const remove = useCallback((recipeId: string) => setEntries(removeFromList(recipeId)), []);
  const clear = useCallback(() => {
    clearList();
    setEntries([]);
  }, []);
  const isListed = useCallback((recipeId: string) => entries.some((e) => e.recipeId === recipeId), [entries]);

  return { entries, hydrated, toggle, remove, clear, isListed };
}

/** Checked-off state for the shopping-list page ("got it") — a plain string
 * set (merged ingredientId, or an unmerged line's key), separate localStorage
 * key so clearing the list doesn't need to also clean this up mid-render;
 * stale keys just never match anything and stop mattering. */
const CHECKED_KEY = "hk:shopping-list-checked";

export function useCheckedOff() {
  const [checked, setChecked] = useState<string[]>([]);

  useEffect(() => {
    setChecked(readLocalStorage<string[]>(CHECKED_KEY, []));
  }, []);

  const toggle = useCallback((key: string) => {
    setChecked((current) => {
      const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
      writeLocalStorage(CHECKED_KEY, next);
      return next;
    });
  }, []);

  const isChecked = useCallback((key: string) => checked.includes(key), [checked]);

  return { toggle, isChecked };
}
