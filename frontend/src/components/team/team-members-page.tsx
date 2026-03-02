"use client"

import { useEffect, useState } from "react"
import { useBusinessStore } from "@/store/useBusinessStore"
import { businessService } from "@/services/business.service"
import type { BusinessMember } from "@/types/business"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/error-handler"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, AlertCircle, Info, UserPlus, RefreshCw } from "lucide-react"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { PageLayout } from "@/components/layout/page-layout"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { InviteMemberModal } from "@/components/team/invite-member-modal"
import { UpdateRoleModal } from "@/components/team/update-role-modal"

// Extended member type with UI-specific fields
type MemberWithProfile = BusinessMember & { email?: string; name?: string }

export function TeamMembersPage() {
    const { currentBusiness, isLoading, businesses, setCurrentBusiness } = useBusinessStore()
    const [members, setMembers] = useState<MemberWithProfile[]>([])
    const [loadingMembers, setLoadingMembers] = useState(false)
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
    const [memberToUpdate, setMemberToUpdate] = useState<MemberWithProfile | null>(null)

    const fetchMembers = async () => {
        if (!currentBusiness) return

        setLoadingMembers(true)
        try {
            const membersList = await businessService.getBusinessMembers(currentBusiness.id)
            setMembers(membersList)
        } catch (error) {
            console.error("Failed to fetch members:", error)
            toast.error("Failed to load team members")
        } finally {
            setLoadingMembers(false)
        }
    }

    useEffect(() => {
        if (currentBusiness) {
            fetchMembers()
        }
    }, [currentBusiness])

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
        )
    }

    if (!currentBusiness) {
        return null
    }

    const canManageMembers = currentBusiness.role === "owner" || currentBusiness.role === "admin"

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <PageLayout onRefresh={fetchMembers}>
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
                                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Team Members</h1>
                                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                                        Manage who has access to {currentBusiness.name}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={fetchMembers}
                                    disabled={loadingMembers}
                                >
                                    <RefreshCw className={`h-4 w-4 mr-2 ${loadingMembers ? 'animate-spin' : ''}`} />
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
                                <CardTitle className="text-base md:text-lg">Active Members</CardTitle>
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
                                            No team members found. Invite members to collaborate on your business.
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
                                                            {(member.name || member.email || "U").substring(0, 2)}
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-medium text-sm md:text-base truncate">
                                                            {member.name || member.email?.split('@')[0] || "Unknown User"}
                                                        </p>
                                                        <p className="text-xs md:text-sm text-muted-foreground truncate">
                                                            {member.email || "No email provided"}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <Badge variant={member.role === "owner" ? "default" : "outline"} className="capitalize">
                                                        {member.role}
                                                    </Badge>
                                                    <Badge variant={member.is_active ? "default" : "secondary"}>
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
                    </div>
                </PageLayout>
            </SidebarInset>

            <InviteMemberModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                onSuccess={fetchMembers}
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
    )
}
