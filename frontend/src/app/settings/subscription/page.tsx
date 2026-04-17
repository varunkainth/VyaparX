import type { Metadata } from "next"
import { BillingSettingsPage } from "@/components/settings/billing-settings-page"

export const metadata: Metadata = {
  title: "Billing Settings",
}

export default function Page() {
  return <BillingSettingsPage />
}
