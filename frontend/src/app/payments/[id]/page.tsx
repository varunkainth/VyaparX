import type { Metadata } from "next"
import { PaymentDetailsPage } from "@/components/payments/payment-details-page"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  return { title: `Payment #${id.slice(0, 8)}` }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PaymentDetailsPage paymentId={id} />
}
