import type { Metadata } from "next"
import { CreateInventoryPage } from "@/components/inventory/create-inventory-page";

export const metadata: Metadata = {
  title: "Add Inventory Item",
}

export default function CreateInventory() {
  return <CreateInventoryPage />;
}
