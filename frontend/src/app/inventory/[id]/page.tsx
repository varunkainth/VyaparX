import { InventoryDetailsPage } from "@/components/inventory/inventory-details-page";

export default async function InventoryItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InventoryDetailsPage itemId={id} />;
}
