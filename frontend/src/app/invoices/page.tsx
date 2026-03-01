import type { Metadata } from "next"
import { InvoicesListPage } from "@/components/invoices/invoices-list-page"

export const metadata: Metadata = {
  title: "Invoices",
}

export default function Page() {
  return <InvoicesListPage />
}
