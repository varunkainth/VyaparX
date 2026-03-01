import type { Metadata } from "next"
import { PartyLedgerPage } from "@/components/ledger/party-ledger-page"

export const metadata: Metadata = {
  title: "Party Ledger",
}

export default function Page() {
  return <PartyLedgerPage />
}
