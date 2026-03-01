import type { Metadata } from "next"
import { CreatePartyPage } from "@/components/parties/create-party-page";

export const metadata: Metadata = {
  title: "Add Party",
}

export default function CreateParty() {
  return <CreatePartyPage />;
}
