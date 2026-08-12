"use client";

/**
 * Local-only custom recipes (§3.38): a customized recipe is a user-owned copy
 * of a catalog recipe, stored in this browser's localStorage. It deliberately
 * does not reuse RecipeDetail because catalog details carry backend-computed
 * nutrition, resolved ingredient grams, and derived dietary tags that would
 * become stale/misleading as soon as a user edits free-text ingredients.
 */
import { useCallback, useEffect, useState } from "react";
import type { Difficulty, RecipeDetail, ResolvedIngredientLine } from "@hells-kitchen/shared";
import { readLocalStorage, writeLocalStorage } from "./storage";

export const CUSTOM_RECIPES_STORAGE_KEY = "hk:custom-recipes";
const CUSTOM_RECIPES_EVENT = "hk:custom-recipes-changed";
export const MIN_CUSTOM_RECIPE_SERVINGS = 1;
export const MAX_CUSTOM_RECIPE_SERVINGS = 24;

export interface CustomRecipe {
  id: string;
  sourceRecipeId: string;
  isCustom: true;
  title: string;
  description: string;
  servings: number;
  prepTime: string;
  cookTime: string;
  difficulty: Difficulty;
  tags: string[];
  ingredients: string[];
  instructions: string[];
  createdAt: string;
  updatedAt: string;
}

export type EditableCustomRecipeFields = Pick<
  CustomRecipe,
  "title" | "description" | "servings" | "prepTime" | "cookTime" | "difficulty" | "tags" | "ingredients" | "instructions"
>;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export function isCustomRecipeId(id: string): boolean {
  return id.startsWith("custom:") && id.length > "custom:".length;
}

function nowIso(): string {
  return new Date().toISOString();
}

function newCustomRecipeId(): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `custom:${random}`;
}

export function ingredientLineToText(line: ResolvedIngredientLine): string {
  const name = line.resolved ? line.name ?? line.ingredientId : `${line.ingredientId} (unknown ingredient)`;
  return `${line.amount} ${line.unit} ${name}`.replace(/\s+/g, " ").trim();
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(cleanString).filter(Boolean) : [];
}

function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === "string" && DIFFICULTIES.includes(value as Difficulty);
}

function normalizeEditableFields(input: EditableCustomRecipeFields): EditableCustomRecipeFields {
  return {
    title: cleanString(input.title),
    description: cleanString(input.description),
    servings: Number(input.servings),
    prepTime: cleanString(input.prepTime),
    cookTime: cleanString(input.cookTime),
    difficulty: input.difficulty,
    tags: cleanStringArray(input.tags),
    ingredients: cleanStringArray(input.ingredients),
    instructions: cleanStringArray(input.instructions),
  };
}

export function validateCustomRecipeInput(input: EditableCustomRecipeFields): ValidationResult {
  const normalized = normalizeEditableFields(input);
  const errors: string[] = [];

  if (!normalized.title) errors.push("Title is required.");
  if (!Number.isInteger(normalized.servings)) errors.push("Servings must be a whole number.");
  if (normalized.servings < MIN_CUSTOM_RECIPE_SERVINGS || normalized.servings > MAX_CUSTOM_RECIPE_SERVINGS) {
    errors.push(`Servings must be between ${MIN_CUSTOM_RECIPE_SERVINGS} and ${MAX_CUSTOM_RECIPE_SERVINGS}.`);
  }
  if (!isDifficulty(normalized.difficulty)) errors.push("Difficulty must be easy, medium, or hard.");
  if (normalized.ingredients.length === 0) errors.push("Add at least one ingredient.");
  if (normalized.instructions.length === 0) errors.push("Add at least one instruction.");

  return { valid: errors.length === 0, errors };
}

function isCustomRecipe(value: unknown): value is CustomRecipe {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Partial<CustomRecipe>;
  if (
    typeof record.id === "string" &&
    isCustomRecipeId(record.id) &&
    typeof record.sourceRecipeId === "string" &&
    record.isCustom === true &&
    typeof record.title === "string" &&
    typeof record.description === "string" &&
    typeof record.servings === "number" &&
    Number.isInteger(record.servings) &&
    record.servings >= MIN_CUSTOM_RECIPE_SERVINGS &&
    record.servings <= MAX_CUSTOM_RECIPE_SERVINGS &&
    typeof record.prepTime === "string" &&
    typeof record.cookTime === "string" &&
    isDifficulty(record.difficulty) &&
    Array.isArray(record.tags) &&
    record.tags.every((tag) => typeof tag === "string") &&
    Array.isArray(record.ingredients) &&
    record.ingredients.every((line) => typeof line === "string") &&
    Array.isArray(record.instructions) &&
    record.instructions.every((step) => typeof step === "string") &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string"
  ) {
    return validateCustomRecipeInput({
      title: record.title,
      description: record.description,
      servings: record.servings,
      prepTime: record.prepTime,
      cookTime: record.cookTime,
      difficulty: record.difficulty,
      tags: record.tags,
      ingredients: record.ingredients,
      instructions: record.instructions,
    }).valid;
  }
  return false;
}

function emitCustomRecipesChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CUSTOM_RECIPES_EVENT));
  }
}

export function loadCustomRecipes(): CustomRecipe[] {
  return getCustomRecipes();
}

export function getCustomRecipes(): CustomRecipe[] {
  const raw = readLocalStorage<unknown>(CUSTOM_RECIPES_STORAGE_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter(isCustomRecipe);
}

function setCustomRecipes(recipes: CustomRecipe[]): void {
  writeLocalStorage(CUSTOM_RECIPES_STORAGE_KEY, recipes);
  emitCustomRecipesChanged();
}

export function getCustomRecipe(id: string): CustomRecipe | null {
  if (!isCustomRecipeId(id)) return null;
  return getCustomRecipes().find((recipe) => recipe.id === id) ?? null;
}

export function createCustomRecipeFromRecipe(recipe: RecipeDetail): CustomRecipe {
  const stamp = nowIso();
  return {
    id: newCustomRecipeId(),
    sourceRecipeId: recipe.id,
    isCustom: true,
    title: recipe.title,
    description: recipe.description,
    servings: recipe.servings,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    difficulty: recipe.difficulty,
    tags: [...recipe.tags],
    ingredients: recipe.ingredients.map(ingredientLineToText),
    instructions: [...recipe.instructions],
    createdAt: stamp,
    updatedAt: stamp,
  };
}

export function saveCustomRecipe(recipe: CustomRecipe): boolean {
  if (!isCustomRecipe(recipe)) return false;
  const current = getCustomRecipes();
  const next = current.some((r) => r.id === recipe.id)
    ? current.map((r) => (r.id === recipe.id ? recipe : r))
    : [...current, recipe];
  setCustomRecipes(next);
  return true;
}

export function updateCustomRecipe(id: string, updates: EditableCustomRecipeFields): CustomRecipe | null {
  if (!isCustomRecipeId(id)) return null;
  const current = getCustomRecipes();
  const existing = current.find((recipe) => recipe.id === id);
  if (!existing) return null;

  const normalized = normalizeEditableFields(updates);
  const validation = validateCustomRecipeInput(normalized);
  if (!validation.valid) return null;

  const nextRecipe: CustomRecipe = { ...existing, ...normalized, updatedAt: nowIso() };
  setCustomRecipes(current.map((recipe) => (recipe.id === id ? nextRecipe : recipe)));
  return nextRecipe;
}

export function deleteCustomRecipe(id: string): void {
  if (!isCustomRecipeId(id)) return;
  setCustomRecipes(getCustomRecipes().filter((recipe) => recipe.id !== id));
}

export function useCustomRecipes() {
  const [customRecipes, setCustomRecipesState] = useState<CustomRecipe[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCustomRecipesState(getCustomRecipes());
    setHydrated(true);
    const onChange = () => setCustomRecipesState(getCustomRecipes());
    window.addEventListener(CUSTOM_RECIPES_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(CUSTOM_RECIPES_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const createFromRecipe = useCallback((recipe: RecipeDetail) => {
    const custom = createCustomRecipeFromRecipe(recipe);
    const saved = saveCustomRecipe(custom);
    setCustomRecipesState(getCustomRecipes());
    return saved ? custom : null;
  }, []);

  const save = useCallback((recipe: CustomRecipe) => {
    const saved = saveCustomRecipe(recipe);
    setCustomRecipesState(getCustomRecipes());
    return saved;
  }, []);

  const update = useCallback((id: string, updates: EditableCustomRecipeFields) => {
    const next = updateCustomRecipe(id, updates);
    setCustomRecipesState(getCustomRecipes());
    return next;
  }, []);

  const remove = useCallback((id: string) => {
    deleteCustomRecipe(id);
    setCustomRecipesState(getCustomRecipes());
  }, []);

  return { customRecipes, hydrated, createFromRecipe, save, update, remove };
}
