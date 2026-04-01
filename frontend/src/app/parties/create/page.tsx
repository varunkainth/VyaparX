import type { Metadata } from "next";
import { CreatePartyPage } from "@/components/parties/create-party-page";

export const metadata: Metadata = {
  title: "Add Party",
};

type PageSearchParams = {
  type?: string;
};

const normalizePartyType = (
  value?: string,
): "customer" | "supplier" | "both" | undefined => {
  if (value === "customer" || value === "supplier" || value === "both") {
    return value;
  }
  return undefined;
};

export default async function CreateParty({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const initialPartyType = normalizePartyType(resolvedSearchParams.type);

  return <CreatePartyPage initialPartyType={initialPartyType} />;
}
