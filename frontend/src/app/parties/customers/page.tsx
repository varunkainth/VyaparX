import type { Metadata } from "next"
import { PartiesListPage } from "@/components/parties/parties-list-page";

export const metadata: Metadata = {
  title: "Customers",
}

export default function CustomersPage() {
  return <PartiesListPage filterType="customer" />;
}
