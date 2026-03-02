"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useNotifications } from "@/hooks/useNotifications"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Separator } from "@/components/ui/separator"
import {
  Bell,
  Package,
  AlertTriangle,
  FileText,
  Wallet,
  CheckCircle,
  Info,
  X,
  Check,
} from "lucide-react"
import type { NotificationType } from "@/types/notification"

const notificationIcons: Record<NotificationType, React.ReactNode> = {
  stock_alert: <Package className="h-5 w-5" />,
  low_stock: <AlertTriangle className="h-5 w-5 text-orange-500" />,
  out_of_stock: <AlertTriangle className="h-5 w-5 text-red-500" />,
  payment_due: <Wallet className="h-5 w-5 text-blue-500" />,
  invoice_overdue: <FileText className="h-5 w-5 text-red-500" />,
  payment_received: <CheckCircle className="h-5 w-5 text-green-500" />,
  system: <Info className="h-5 w-5 text-blue-500" />,
  info: <Info className="h-5 w-5" />,
}

const priorityColors = {
  low: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  medium: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  urgent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
}

export function NotificationsPage() {
  const router = useRouter()
  const { notifications, stats, markAsRead, markAllAsRead, clearNotification } = useNotifications()
  const [filter, setFilter] = useState<"all" | "unread">("all")

  const filteredNotifications = filter === "unread" 
    ? notifications.filter((n) => !n.read)
    : notifications

  const handleNotificationClick = (notificationId: string, link?: string) => {
    markAsRead(notificationId)
    if (link) {
      router.push(link)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <PageLayout>
          {/* Header */}
          <header className="flex h-16 shrink-0 items-center gap-2 border-b">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Notifications</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          {/* Main Content */}
          <div className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6 pb-20 md:pb-6">
            {/* Page Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 md:p-3 rounded-xl bg-primary/10 border-2 border-primary/20 shrink-0">
                  <Bell className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
                    Notifications
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                    Stay updated with important alerts
                  </p>
                </div>
              </div>
              {stats.unread > 0 && (
                <Button onClick={markAllAsRead} variant="outline" className="cursor-pointer">
                  <Check className="h-4 w-4 mr-2" />
                  Mark all as read
                </Button>
              )}
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Unread</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{stats.unread}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Stock Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {stats.by_type.low_stock + stats.by_type.out_of_stock}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Urgent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {stats.by_priority.urgent}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Notifications List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Notifications</CardTitle>
                    <CardDescription>
                      {filteredNotifications.length} notification(s)
                    </CardDescription>
                  </div>
                  <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "unread")}>
                    <TabsList>
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="unread">
                        Unread {stats.unread > 0 && `(${stats.unread})`}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent>
                {filteredNotifications.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No notifications</p>
                    <p className="text-sm mt-1">
                      {filter === "unread" 
                        ? "You've read all your notifications" 
                        : "You're all caught up!"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                          !notification.read ? "bg-primary/5 border-primary/20" : ""
                        }`}
                        onClick={() => handleNotificationClick(notification.id, notification.link)}
                      >
                        <div className="mt-1 shrink-0">
                          {notificationIcons[notification.type]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium">{notification.title}</p>
                              <Badge
                                variant="outline"
                                className={`text-xs ${priorityColors[notification.priority]}`}
                              >
                                {notification.priority}
                              </Badge>
                              {!notification.read && (
                                <Badge variant="default" className="text-xs">
                                  New
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                clearNotification(notification.id)
                              }}
                              className="h-8 w-8 p-0 shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(notification.created_at).toLocaleString("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </p>
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
    </SidebarProvider>
  )
}
