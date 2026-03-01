import type { Metadata } from "next"
import { CreateInvoicePage } from "@/components/invoices/create-invoice-page"

export const metadata: Metadata = {
  title: "Create Sales Invoice",
}

export default function Page() {
  return <CreateInvoicePage invoiceType="sales" />
}
