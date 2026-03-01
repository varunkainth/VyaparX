"use client"

import { useEffect, useState } from "react"
import { analyticsService } from "@/services/analytics.service"
import { useBusinessStore } from "@/store/useBusinessStore"
import type { ActivityData } from "@/types/analytics"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/error-handler"
import { Card, CardContent,} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  type LucideIcon,
  FileText,
  Package,
  Wallet,
  Settings,
  UserPlus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Activity as ActivityIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

const EVENT_ICONS: Record<string, LucideIcon> = {
  invoice_created: FileText,
  invoice_updated: Edit,
  invoice_cancelled: XCircle,
  payment_recorded: Wallet,
  payment_reconciled: CheckCircle,
  party_created: UserPlus,
  party_updated: Edit,
  party_deleted: Trash2,
  inventory_created: Package,
  inventory_updated: Edit,
  inventory_stock_adjusted: Package,
  business_updated: Settings,
  member_invited: UserPlus,
}

const EVENT_COLORS: Record<string, string> = {
  invoice_created: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  invoice_updated: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  invoice_cancelled: "bg-red-500/10 text-red-700 dark:text-red-400",
  payment_recorded: "bg-green-500/10 text-green-700 dark:text-green-400",
  payment_reconciled: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  party_created: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  party_updated: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  party_deleted: "bg-red-500/10 text-red-700 dark:text-red-400",
  inventory_created: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
  inventory_updated: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  inventory_stock_adjusted: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  business_updated: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
  member_invited: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
}

export function ActivityPage() {
  const { currentBusiness } = useBusinessStore()
  const [activityData, setActivityData] = useState<ActivityData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const limit = 20

  useEffect(() => {
    if (currentBusiness) {
      fetchActivity()
    }
  }, [currentBusiness, currentPage])

  const fetchActivity = async () => {
    if (!currentBusiness) return

    setIsLoading(true)
    try {
      const data = await analyticsService.getActivity(
        currentBusiness.id,
        currentPage,
        limit
      )
      setActivityData(data)
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getEventIcon = (eventType: string) => {
    return EVENT_ICONS[eventType] || ActivityIcon
  }

  const getEventColor = (eventType: string) => {
    return EVENT_COLORS[eventType] || "bg-gray-500/10 text-gray-700 dark:text-gray-400"
  }

  const formatEventType = (eventType: string) => {
    return eventType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  if (!currentBusiness) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Please select a business first</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6 pb-20 md:pb-6">
        <Skeleton className="h-8 md:h-9 w-40 md:w-48" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="pt-4 md:pt-6">
                <div className="flex items-start gap-3 md:gap-4">
                  <Skeleton className="h-9 w-9 md:h-10 md:w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!activityData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Failed to load activity data</p>
      </div>
    )
  }

  const totalPages = Math.ceil(activityData.total / limit)

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Recent Activity</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            All activities and events in {currentBusiness.name}
          </p>
        </div>
        <Badge variant="outline" className="text-xs md:text-sm w-fit">
          {activityData.total} total events
        </Badge>
      </div>

      {/* Activity Timeline */}
      {activityData.events.length === 0 ? (
        <Card>
          <CardContent className="py-10 md:py-12">
            <div className="text-center text-muted-foreground">
              <ActivityIcon className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm md:text-base">No activity recorded yet</p>
              <p className="text-xs md:text-sm mt-1">
                Activities will appear here as you use the system
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {activityData.events.map((event) => {
            const Icon = getEventIcon(event.event_type)
            const colorClass = getEventColor(event.event_type)

            return (
              <Card key={event.id} className="hover:bg-accent/50 transition-colors active:scale-98">
                <CardContent className="pt-4 md:pt-6">
                  <div className="flex items-start gap-3 md:gap-4">
                    <div className={`p-2 rounded-lg shrink-0 ${colorClass}`}>
                      <Icon className="h-4 w-4 md:h-5 md:w-5" />
                    </div>
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight">
                            {event.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {formatEventType(event.event_type)}
                            </Badge>
                            {event.user_name && (
                              <span className="text-xs text-muted-foreground">
                                by {event.user_name}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                          {formatDateTime(event.created_at)}
                        </span>
                      </div>

                      {/* Metadata */}
                      {event.metadata && Object.keys(event.metadata).length > 0 && (
                        <div className="mt-3 p-2 md:p-3 rounded-lg bg-muted/50 space-y-1">
                          {Object.entries(event.metadata).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-2 text-xs">
                              <span className="text-muted-foreground capitalize">
                                {key.replace(/_/g, " ")}:
                              </span>
                              <span className="font-medium truncate">
                                {typeof value === "object"
                                  ? JSON.stringify(value)
                                  : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-xs md:text-sm text-muted-foreground text-center sm:text-left">
                Showing {(currentPage - 1) * limit + 1} to{" "}
                {Math.min(currentPage * limit, activityData.total)} of{" "}
                {activityData.total} events
              </div>
              <div className="flex items-center justify-center gap-1 md:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2 md:px-3"
                >
                  <ChevronLeft className="h-4 w-4 md:mr-1" />
                  <span className="hidden md:inline">Previous</span>
                </Button>
                <div className="flex items-center gap-0.5 md:gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 md:w-10 h-8 md:h-9 text-xs md:text-sm"
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 md:px-3"
                >
                  <span className="hidden md:inline">Next</span>
                  <ChevronRight className="h-4 w-4 md:ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
