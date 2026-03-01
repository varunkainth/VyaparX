import type { Metadata } from "next"
import { CreateBusinessPage } from "@/components/business/create-business-page";

export const metadata: Metadata = {
  title: "Create Business",
}

export default function CreateBusiness() {
  return <CreateBusinessPage />;
}
