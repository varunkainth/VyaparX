import type { Metadata } from "next"
import { PartyDetailsPage } from "@/components/parties/party-details-page";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  return { title: `Party #${id.slice(0, 8)}` }
}

export default async function PartyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PartyDetailsPage partyId={id} />;
}
