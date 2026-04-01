"use client";

import { useEffect, useState } from "react";
import { useBusinessStore } from "@/store/useBusinessStore";
import { businessService } from "@/services/business.service";
import type { BusinessMember, ListedBusinessInvite } from "@/types/business";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-handler";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users,
  Info,
  UserPlus,
  RefreshCw,
  MailPlus,
  Link as LinkIcon,
  Ban,
  Copy,
} from "lucide-react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { PageLayout } from "@/components/layout/page-layout";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { InviteMemberModal } from "@/components/team/invite-member-modal";
import { UpdateRoleModal } from "@/components/team/update-role-modal";
import { hasPermission } from "@/lib/permissions";

// Extended member type with UI-specific fields
type MemberWithProfile = BusinessMember & { email?: string; name?: string };
type InviteStatus = NonNullable<ListedBusinessInvite["status"]>;

const inviteStatusMeta: Record<
  InviteStatus,
  { badgeVariant: "default" | "secondary" | "outline"; label: string }
> = {
  pending: { badgeVariant: "default", label: "Pending" },
  accepted: { badgeVariant: "secondary", label: "Accepted" },
  expired: { badgeVariant: "outline", label: "Expired" },
  revoked: { badgeVariant: "outline", label: "Revoked" },
};

const inviteFilterOptions = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "revoked", label: "Revoked" },
  { value: "expired", label: "Expired" },
] as const;

type InviteFilter = (typeof inviteFilterOptions)[number]["value"];

const inviteSortOptions = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "expiring", label: "Expiring soon" },
] as const;

type InviteSort = (typeof inviteSortOptions)[number]["value"];

export function TeamMembersPage() {
  const { currentBusiness, isLoading, businesses } = useBusinessStore();
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [invites, setInvites] = useState<ListedBusinessInvite[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [memberToUpdate, setMemberToUpdate] =
    useState<MemberWithProfile | null>(null);
  const [inviteActionId, setInviteActionId] = useState<string | null>(null);
  const [inviteFilter, setInviteFilter] = useState<InviteFilter>("all");
  const [inviteSearch, setInviteSearch] = useState("");
  const [inviteSort, setInviteSort] = useState<InviteSort>("newest");

  const fetchMembers = async () => {
    if (!currentBusiness) return;

    setLoadingMembers(true);
    try {
      const membersList = await businessService.getBusinessMembers(
        currentBusiness.id,
      );
      setMembers(membersList);
    } catch (error) {
      console.error("Failed to fetch members:", error);
      toast.error("Failed to load team members");
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchInvites = async () => {
    if (!currentBusiness) return;

    setLoadingInvites(true);
    try {
      setInvites(await businessService.listBusinessInvites(currentBusiness.id));
    } catch (error) {
      console.error("Failed to fetch invites:", error);
      toast.error("Failed to load business invites");
    } finally {
      setLoadingInvites(false);
    }
  };

  const fetchTeamAccess = async () => {
    if (!currentBusiness) return;

    setLoadingMembers(true);
    setLoadingInvites(true);

    try {
      const [membersList, inviteList] = await Promise.all([
        businessService.getBusinessMembers(currentBusiness.id),
        businessService.listBusinessInvites(currentBusiness.id),
      ]);

      setMembers(membersList);
      setInvites(inviteList);
    } catch (error) {
      console.error("Failed to fetch team access data:", error);
      toast.error("Failed to load team members and invites");
    } finally {
      setLoadingMembers(false);
      setLoadingInvites(false);
    }
  };

  const handleResendInvite = async (invite: ListedBusinessInvite) => {
    if (!currentBusiness) return;

    setInviteActionId(invite.id);
    try {
      const result = await businessService.inviteMember(currentBusiness.id, {
        email: invite.email,
        role: invite.role,
      });
      await fetchInvites();

      if (result.email_sent) {
        toast.success(`Invite re-sent to ${invite.email}`);
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(result.invite_url);
        toast.success(
          `Email service unavailable. Copied fresh invite link for ${invite.email}.`,
        );
        return;
      }

      toast.success(
        "Invite refreshed. Copy the link from the API response if needed.",
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setInviteActionId(null);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!currentBusiness) return;

    setInviteActionId(inviteId);
    try {
      const revokedInvite = await businessService.revokeInvite(
        currentBusiness.id,
        inviteId,
      );
      setInvites((current) =>
        current.map((invite) =>
          invite.id === inviteId ? revokedInvite : invite,
        ),
      );
      toast.success("Pending invite revoked");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setInviteActionId(null);
    }
  };

  const handleCopyInviteLink = async (invite: ListedBusinessInvite) => {
    try {
      if (typeof window === "undefined") {
        toast.error("Invite link can only be copied in the browser.");
        return;
      }

      const inviteUrl = `${window.location.origin}/accept-invite?token=${encodeURIComponent(invite.token)}`;

      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteUrl);
        toast.success(`Invite link copied for ${invite.email}`);
        return;
      }

      toast.error("Clipboard is not available in this browser.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const renderInviteRow = (invite: ListedBusinessInvite) => {
    const status = invite.status ?? "expired";
    const statusMeta = inviteStatusMeta[status];
    const isPending = status === "pending";
    const isBusy = inviteActionId === invite.id;
    const activityTimestamp =
      status === "accepted"
        ? invite.accepted_at
        : status === "revoked"
          ? invite.revoked_at
          : invite.expires_at;

    return (
      <div
        key={invite.id}
        className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0 space-y-1">
          <p className="truncate font-medium text-sm md:text-base">
            {invite.email}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground md:text-sm">
            <Badge variant="outline" className="capitalize">
              {invite.role}
            </Badge>
            <Badge variant={statusMeta.badgeVariant}>{statusMeta.label}</Badge>
            <span>Sent {new Date(invite.created_at).toLocaleString()}</span>
            {isPending ? (
              <span>
                Expires {new Date(invite.expires_at).toLocaleString()}
              </span>
            ) : activityTimestamp ? (
              <span>
                {statusMeta.label}{" "}
                {new Date(activityTimestamp).toLocaleString()}
              </span>
            ) : null}
          </div>
        </div>
        {isPending ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isBusy}
              onClick={() => void handleResendInvite(invite)}
            >
              <LinkIcon className="mr-2 h-4 w-4" />
              {isBusy ? "Working..." : "Resend"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isBusy}
              onClick={() => void handleCopyInviteLink(invite)}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy link
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={isBusy}
              onClick={() => void handleRevokeInvite(invite.id)}
            >
              <Ban className="mr-2 h-4 w-4" />
              Revoke
            </Button>
          </div>
        ) : null}
      </div>
    );
  };

  useEffect(() => {
    if (currentBusiness) {
      void fetchTeamAccess();
    }
  }, [currentBusiness]);

  // Show loading while waiting for business to be selected
  if (isLoading || (!currentBusiness && businesses.length > 0)) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-center space-y-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
              <p className="text-muted-foreground">Loading team settings...</p>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!currentBusiness) {
    return null;
  }

  const canManageMembers = hasPermission(currentBusiness.role, "manageMembers");
  const filteredInvites = invites
    .filter((invite) =>
      inviteFilter === "all" ? true : invite.status === inviteFilter,
    )
    .filter((invite) =>
      invite.email.toLowerCase().includes(inviteSearch.trim().toLowerCase()),
    )
    .sort((left, right) => {
      if (inviteSort === "oldest") {
        return (
          new Date(left.created_at).getTime() -
          new Date(right.created_at).getTime()
        );
      }

      if (inviteSort === "expiring") {
        const leftTime = new Date(left.expires_at).getTime();
        const rightTime = new Date(right.expires_at).getTime();
        return leftTime - rightTime;
      }

      return (
        new Date(right.created_at).getTime() -
        new Date(left.created_at).getTime()
      );
    });

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <PageLayout
          onRefresh={async () => {
            await Promise.all([fetchMembers(), fetchInvites()]);
          }}
        >
          <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/settings">Settings</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Team Members</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6 pb-20 md:pb-6">
            <div className="flex flex-col gap-3 md:gap-0 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 md:p-3 rounded-xl bg-primary/10 border-2 border-primary/20 shrink-0">
                  <Users className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
                    Team Members
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                    Manage who has access to {currentBusiness.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void fetchTeamAccess()}
                  disabled={loadingMembers || loadingInvites}
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${loadingMembers || loadingInvites ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
                {canManageMembers && (
                  <Button size="sm" onClick={() => setIsInviteModalOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Member
                  </Button>
                )}
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base md:text-lg">
                  Active Members
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  People who currently have access to this business context.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingMembers ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                ) : members.length === 0 ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs md:text-sm">
                      No team members found. Invite members to collaborate on
                      your business.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="font-medium text-primary uppercase">
                              {(member.name || member.email || "U").substring(
                                0,
                                2,
                              )}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm md:text-base truncate">
                              {member.name ||
                                member.email?.split("@")[0] ||
                                "Unknown User"}
                            </p>
                            <p className="text-xs md:text-sm text-muted-foreground truncate">
                              {member.email || "No email provided"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge
                            variant={
                              member.role === "owner" ? "default" : "outline"
                            }
                            className="capitalize"
                          >
                            {member.role}
                          </Badge>
                          <Badge
                            variant={member.is_active ? "default" : "secondary"}
                          >
                            {member.is_active ? "Active" : "Inactive"}
                          </Badge>

                          {canManageMembers && member.role !== "owner" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setMemberToUpdate(member)}
                            >
                              Manage
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {canManageMembers ? (
              <Card>
                <CardHeader className="gap-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle className="text-base md:text-lg">
                        Invite Tracker
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs md:text-sm">
                        Review outstanding invites, resend them, revoke access,
                        or inspect invite history.
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {inviteFilterOptions.map((option) => (
                        <Button
                          key={option.value}
                          type="button"
                          variant={
                            inviteFilter === option.value
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => setInviteFilter(option.value)}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <Input
                      value={inviteSearch}
                      onChange={(event) => setInviteSearch(event.target.value)}
                      placeholder="Search by email"
                      className="md:max-w-xs"
                    />
                    <div className="flex flex-wrap gap-2">
                      {inviteSortOptions.map((option) => (
                        <Button
                          key={option.value}
                          type="button"
                          variant={
                            inviteSort === option.value ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setInviteSort(option.value)}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {(
                      [
                        "pending",
                        "accepted",
                        "revoked",
                        "expired",
                      ] as InviteStatus[]
                    ).map((status) => (
                      <div key={status} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between gap-2">
                          <Badge
                            variant={inviteStatusMeta[status].badgeVariant}
                          >
                            {inviteStatusMeta[status].label}
                          </Badge>
                          <span className="text-2xl font-semibold">
                            {
                              invites.filter(
                                (invite) => invite.status === status,
                              ).length
                            }
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingInvites ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    </div>
                  ) : filteredInvites.length === 0 ? (
                    <Alert>
                      <MailPlus className="h-4 w-4" />
                      <AlertDescription className="text-xs md:text-sm">
                        No invites found for the selected filter.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-3">
                      {filteredInvites.map((invite) => renderInviteRow(invite))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </PageLayout>
      </SidebarInset>

      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={async () => {
          await Promise.all([fetchMembers(), fetchInvites()]);
        }}
        businessId={currentBusiness.id}
      />

      {memberToUpdate && (
        <UpdateRoleModal
          isOpen={!!memberToUpdate}
          onClose={() => setMemberToUpdate(null)}
          onSuccess={fetchMembers}
          businessId={currentBusiness.id}
          member={memberToUpdate}
        />
      )}
    </SidebarProvider>
  );
}
