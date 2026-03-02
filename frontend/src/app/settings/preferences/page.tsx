import type { Metadata } from "next"
import { PreferencesPage } from "@/components/settings/preferences-page"

export const metadata: Metadata = {
  title: "Preferences",
}

export default function Preferences() {
  return <PreferencesPage />
}
