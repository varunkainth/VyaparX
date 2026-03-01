import type { Metadata } from "next"
import { CreateInvoicePage } from "@/components/invoices/create-invoice-page"

export const metadata: Metadata = {
  title: "Create Purchase Invoice",
}

export default function Page() {
  return <CreateInvoicePage invoiceType="purchase" />
}
