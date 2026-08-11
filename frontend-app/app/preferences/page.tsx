import type { Metadata } from "next";
import { PreferencesPanel } from "./PreferencesPanel";

export const metadata: Metadata = {
  title: "Preferences — Hell's Kitchen",
};

// Server wrapper purely so this route gets a real <title> (client components
// can't export `metadata`, same split used by /recipes/[id] + ScalableRecipeBody).
export default function PreferencesPage() {
  return <PreferencesPanel />;
}
