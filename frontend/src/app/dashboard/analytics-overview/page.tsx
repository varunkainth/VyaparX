import type { Metadata } from "next"
import { AnalyticsOverviewPage } from "@/components/analytics/analytics-overview-page";

export const metadata: Metadata = {
  title: "Analytics Overview",
}

export default function Page() {
  return <AnalyticsOverviewPage />;
}
