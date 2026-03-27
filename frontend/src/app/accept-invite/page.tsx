import type { Metadata } from "next"
import { AcceptInvitePage } from "@/components/team/accept-invite-page"

export const metadata: Metadata = {
  title: "Accept Invite",
}

export default function AcceptInviteRoute() {
  return <AcceptInvitePage />
}
