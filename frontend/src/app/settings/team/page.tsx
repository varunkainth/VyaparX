import type { Metadata } from "next"
import { TeamMembersPage } from "@/components/team/team-members-page";

export const metadata: Metadata = {
    title: "Team Members Settings",
}

export default function TeamSettings() {
    return <TeamMembersPage />;
}
