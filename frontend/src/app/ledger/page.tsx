import type { Metadata } from "next"
import { LedgerStatementPage } from "@/components/ledger/ledger-statement-page"

export const metadata: Metadata = {
  title: "Ledger",
}

export default function Page() {
  return <LedgerStatementPage />
}
