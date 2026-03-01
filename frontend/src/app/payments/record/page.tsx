import type { Metadata } from "next"
import { RecordPaymentPage } from "@/components/payments/record-payment-page"

export const metadata: Metadata = {
  title: "Record Payment",
}

export default function Page() {
  return <RecordPaymentPage />
}
