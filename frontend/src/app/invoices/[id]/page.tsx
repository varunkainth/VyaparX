import type { Metadata } from "next"
import { InvoiceDetailsPage } from "@/components/invoices/invoice-details-page"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  return { title: `Invoice #${id.slice(0, 8)}` }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <InvoiceDetailsPage invoiceId={id} />
}
