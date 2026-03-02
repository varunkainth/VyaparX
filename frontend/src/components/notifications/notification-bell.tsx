"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useNotifications } from "@/hooks/useNotifications"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Bell,
  Package,
  AlertTriangle,
  FileText,
  Wallet,
  CheckCircle,
  Info,
  X,
  RefreshCw,
} from "lucide-react"
import type { NotificationType } from "@/types/notification"

const notificationIcons: Record<NotificationType, React.ReactNode> = {
  stock_alert: <Package className="h-4 w-4" />,
  low_stock: <AlertTriangle className="h-4 w-4 text-orange-500" />,
  out_of_stock: <AlertTriangle className="h-4 w-4 text-red-500" />,
  payment_due: <Wallet className="h-4 w-4 text-blue-500" />,
  invoice_overdue: <FileText className="h-4 w-4 text-red-500" />,
  payment_received: <CheckCircle className="h-4 w-4 text-green-500" />,
  system: <Info className="h-4 w-4 text-blue-500" />,
  info: <Info className="h-4 w-4" />,
}

export function NotificationBell() {
  const router = useRouter()
  const { notifications, stats, isLoading, markAsRead, markAllAsRead, clearNotification, refresh } = useNotifications()
  const [open, setOpen] = useState(false)

  const handleNotificationClick = (notificationId: string, link?: string) => {
    markAsRead(notificationId)
    if (link) {
      router.push(link)
      setOpen(false)
    }
  }

  const unreadNotifications = notifications.filter((n) => !n.read)
  const hasUnread = stats.unread > 0

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {hasUnread && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {stats.unread > 9 ? "9+" : stats.unread}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 md:w-96">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                refresh()
              }}
              disabled={isLoading}
              className="h-7 w-7 p-0"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            {hasUnread && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  markAllAsRead()
                }}
                className="h-7 text-xs"
              >
                Mark all read
              </Button>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No notifications</p>
            <p className="text-xs mt-1">You're all caught up!</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-1 p-1">
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={`flex items-start gap-3 p-3 cursor-pointer ${
                    !notification.read ? "bg-primary/5" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification.id, notification.link)}
                >
                  <div className="mt-0.5 shrink-0">
                    {notificationIcons[notification.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-tight">
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(notification.created_at).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      clearNotification(notification.id)
                    }}
                    className="h-6 w-6 p-0 shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </DropdownMenuItem>
              ))}
            </div>
          </ScrollArea>
        )}

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="justify-center text-sm text-primary cursor-pointer"
              onClick={() => {
                router.push("/notifications")
                setOpen(false)
              }}
            >
              View all notifications
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
