import type { Metadata } from "next";
import { SavedRecipes } from "./SavedRecipes";

export const metadata: Metadata = {
  title: "Saved Recipes — Hell's Kitchen",
};

export default function SavedPage() {
  return <SavedRecipes />;
}
