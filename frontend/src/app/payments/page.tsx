import type { Metadata } from "next"
import { PaymentsListPage } from "@/components/payments/payments-list-page"

export const metadata: Metadata = {
  title: "Payments",
}

export default function Page() {
  return <PaymentsListPage />
}
