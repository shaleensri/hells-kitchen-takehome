import { redirect } from "next/navigation";

// The core README routes are /recipes and /recipes/[id] — root just forwards there.
export default function RootPage() {
  redirect("/recipes");
}
