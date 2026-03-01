import type { Metadata } from "next"
import { BusinessSettingsPage } from "@/components/business/business-settings-page";

export const metadata: Metadata = {
  title: "Business Settings",
}

export default function BusinessSettings() {
  return <BusinessSettingsPage />;
}
