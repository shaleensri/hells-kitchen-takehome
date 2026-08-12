import type { Metadata } from "next";
import { EditCustomRecipeForm } from "./EditCustomRecipeForm";

interface EditCustomRecipePageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Edit Custom Recipe — Hell's Kitchen",
};

export default async function EditCustomRecipePage({ params }: EditCustomRecipePageProps) {
  const { id } = await params;
  return <EditCustomRecipeForm id={decodeURIComponent(id)} />;
}
