import type { Metadata } from "next"
import { PartiesListPage } from "@/components/parties/parties-list-page";

export const metadata: Metadata = {
  title: "Suppliers",
}

export default function SuppliersPage() {
  return <PartiesListPage filterType="supplier" />;
}
