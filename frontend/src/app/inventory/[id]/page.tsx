import type { Metadata } from "next"
import { InventoryDetailsPage } from "@/components/inventory/inventory-details-page";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  return { title: `Item #${id.slice(0, 8)}` }
}

export default async function InventoryItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InventoryDetailsPage itemId={id} />;
}
