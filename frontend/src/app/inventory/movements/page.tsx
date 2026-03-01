import type { Metadata } from "next"
import { InventoryMovementsPage } from "@/components/inventory/inventory-movements-page"

export const metadata: Metadata = {
  title: "Stock Movements",
}

export default function Page() {
  return <InventoryMovementsPage />
}
