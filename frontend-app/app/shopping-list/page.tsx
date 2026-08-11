import type { Metadata } from "next";
import { ShoppingListPanel } from "./ShoppingListPanel";

export const metadata: Metadata = {
  title: "Shopping List — Hell's Kitchen",
};

export default function ShoppingListPage() {
  return <ShoppingListPanel />;
}
