import type { Metadata } from "next"
import { OutstandingReportPage } from "@/components/reports/outstanding-report-page";

export const metadata: Metadata = {
  title: "Outstanding Report",
}

export default function Page() {
  return <OutstandingReportPage />;
}
