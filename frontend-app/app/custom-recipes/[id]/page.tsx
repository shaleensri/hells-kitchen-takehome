import type { Metadata } from "next";
import { CustomRecipeDetail } from "./CustomRecipeDetail";

interface CustomRecipePageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Custom Recipe — Hell's Kitchen",
};

export default async function CustomRecipePage({ params }: CustomRecipePageProps) {
  const { id } = await params;
  return <CustomRecipeDetail id={decodeURIComponent(id)} />;
}
