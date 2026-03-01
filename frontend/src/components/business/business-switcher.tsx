"use client"

import * as React from "react"
import { ChevronsUpDown, Plus, Building2 } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useBusinessStore } from "@/store/useBusinessStore"
import { useAuthStore } from "@/store/useAuthStore"
import { authService } from "@/services/auth.service"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/error-handler"
import { updateBusinessContext } from "@/lib/business-utils"

export function BusinessSwitcher() {
  const { isMobile } = useSidebar()
  const router = useRouter()
  
  // Get businesses from store (already fetched by AuthGuard)
  const { currentBusiness, businesses, isLoading } = useBusinessStore()

  const handleSwitchBusiness = async (businessId: string) => {
    try {
      // Find the business first
      const business = businesses.find((b) => b.id === businessId)
      
      if (!business) {
        toast.error("Business not found")
        return
      }
      
      // Switch business on backend
      const response = await authService.switchBusiness({ business_id: businessId })
      
      // Update tokens, session, and current business
      updateBusinessContext(response.tokens, response.session, business)
      
      toast.success(`Switched to ${business.name}`)
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage)
    }
  }

  const handleCreateBusiness = () => {
    router.push("/business/create")
  }

  // If loading, show loading state
  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              <Building2 className="size-4 animate-pulse" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">Loading...</span>
              <span className="truncate text-xs text-muted-foreground">Please wait</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  // If no businesses, show create option
  if (!businesses || businesses.length === 0) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            onClick={handleCreateBusiness}
            className="cursor-pointer"
          >
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              <Building2 className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">No Business</span>
              <span className="truncate text-xs text-muted-foreground">Create one</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  const activeBusiness = currentBusiness || businesses[0]

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Building2 className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeBusiness.name}</span>
                <span className="truncate text-xs capitalize">{activeBusiness.role}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Businesses
            </DropdownMenuLabel>
            {businesses.map((business, index) => (
              <DropdownMenuItem
                key={business.id}
                onClick={() => handleSwitchBusiness(business.id)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <Building2 className="size-3.5 shrink-0" />
                </div>
                <div className="flex flex-col flex-1">
                  <span className="text-sm">{business.name}</span>
                  <span className="text-xs text-muted-foreground capitalize">{business.role}</span>
                </div>
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2" onClick={handleCreateBusiness}>
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">Create New Business</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
