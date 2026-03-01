import type { Metadata } from "next"
import { InventoryListPage } from "@/components/inventory/inventory-list-page";

export const metadata: Metadata = {
  title: "Inventory",
}

export default function InventoryPage() {
  return <InventoryListPage />;
}
