import type { Metadata } from "next"
import { PublicInvoicePage } from "@/components/invoices/public-invoice-page"

export async function generateMetadata({ params }: { params: Promise<{ invoiceId: string }> }): Promise<Metadata> {
  const { invoiceId } = await params
  return { title: `Digital Bill ${invoiceId.slice(0, 8)}` }
}

export default async function Page({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params
  return <PublicInvoicePage invoiceId={invoiceId} />
}
