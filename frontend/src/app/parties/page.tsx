import type { Metadata } from "next"
import { PartiesListPage } from "@/components/parties/parties-list-page";

export const metadata: Metadata = {
  title: "Parties",
}

export default function PartiesPage() {
  return <PartiesListPage />;
}
