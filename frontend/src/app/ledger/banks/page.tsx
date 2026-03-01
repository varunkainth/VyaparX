import type { Metadata } from "next"
import { BankAccountsPage } from "@/components/ledger/bank-accounts-page"

export const metadata: Metadata = {
  title: "Bank Accounts",
}

export default function Page() {
  return <BankAccountsPage />
}
