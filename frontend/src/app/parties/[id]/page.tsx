import { PartyDetailsPage } from "@/components/parties/party-details-page";

export default async function PartyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PartyDetailsPage partyId={id} />;
}
