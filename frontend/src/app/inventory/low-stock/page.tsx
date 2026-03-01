import type { Metadata } from "next"
import { InventoryLowStockPage } from "@/components/inventory/inventory-low-stock-page"

export const metadata: Metadata = {
  title: "Low Stock Alerts",
}

export default function Page() {
  return <InventoryLowStockPage />
}
