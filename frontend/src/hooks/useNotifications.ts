"use client"

import { useState, useEffect, useCallback } from "react"
import { useBusinessStore } from "@/store/useBusinessStore"
import { notificationService } from "@/services/notification.service"
import type { Notification, NotificationStats, NotificationPreferences } from "@/types/notification"
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/types/notification"

const PREFERENCES_KEY = "notificationPreferences"

export function useNotifications() {
  const { currentBusiness } = useBusinessStore()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES)
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
    by_type: {
      stock_alert: 0,
      payment_due: 0,
      invoice_overdue: 0,
      low_stock: 0,
      out_of_stock: 0,
      payment_received: 0,
      system: 0,
      info: 0,
    },
    by_priority: {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
    },
  })
  const [isLoading, setIsLoading] = useState(true)

  // Load preferences from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(PREFERENCES_KEY)
    if (stored) {
      try {
        setPreferences(JSON.parse(stored))
      } catch (error) {
        console.error("Error loading notification preferences:", error)
      }
    }
  }, [])

  const updatePreferences = useCallback((newPreferences: NotificationPreferences) => {
    setPreferences(newPreferences)
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(newPreferences))
  }, [])

  const buildStats = useCallback((items: Notification[]): NotificationStats => {
    const nextStats: NotificationStats = {
      total: items.length,
      unread: items.filter((item) => !item.read).length,
      by_type: {
        stock_alert: 0,
        payment_due: 0,
        invoice_overdue: 0,
        low_stock: 0,
        out_of_stock: 0,
        payment_received: 0,
        system: 0,
        info: 0,
      },
      by_priority: {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0,
      },
    }

    items.forEach((item) => {
      nextStats.by_type[item.type]++
      nextStats.by_priority[item.priority]++
    })

    return nextStats
  }, [])

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    try {
      // If notifications are disabled globally, return empty
      if (!preferences.enabled) {
        setNotifications([])
        setStats({
          total: 0,
          unread: 0,
          by_type: {
            stock_alert: 0,
            payment_due: 0,
            invoice_overdue: 0,
            low_stock: 0,
            out_of_stock: 0,
            payment_received: 0,
            system: 0,
            info: 0,
          },
          by_priority: {
            low: 0,
            medium: 0,
            high: 0,
            urgent: 0,
          },
        })
        setIsLoading(false)
        return
      }

      if (!currentBusiness) {
        setNotifications([])
        setStats(buildStats([]))
        return
      }

      const apiNotifications = await notificationService.listNotifications(currentBusiness.id)
      
      // Filter notifications based on preferences
      const filteredNotifications = apiNotifications.filter(
        (notif) => preferences.types[notif.type]
      )

      setNotifications(filteredNotifications)
      setStats(buildStats(filteredNotifications))
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setIsLoading(false)
    }
  }, [buildStats, currentBusiness, preferences])

  const markAsRead = useCallback((notificationId: string) => {
    if (!currentBusiness) return

    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    )
    setStats((prev) => ({
      ...prev,
      unread: Math.max(0, prev.unread - 1),
    }))

    void notificationService.markAsRead(currentBusiness.id, notificationId).catch((error) => {
      console.error("Error marking notification as read:", error)
      void fetchNotifications()
    })
  }, [currentBusiness, fetchNotifications])

  const markAllAsRead = useCallback(() => {
    if (!currentBusiness) return

    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })))
    setStats((prev) => ({ ...prev, unread: 0 }))

    void notificationService.markAllAsRead(currentBusiness.id).catch((error) => {
      console.error("Error marking all notifications as read:", error)
      void fetchNotifications()
    })
  }, [currentBusiness, fetchNotifications, notifications])

  const clearNotification = useCallback((notificationId: string) => {
    if (!currentBusiness) return

    const notificationToClear = notifications.find((n) => n.id === notificationId)
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
    setStats((prev) => ({
      ...prev,
      total: Math.max(0, prev.total - 1),
      unread: Math.max(0, prev.unread - (notificationToClear?.read ? 0 : 1)),
    }))

    void notificationService.clearNotification(currentBusiness.id, notificationId).catch((error) => {
      console.error("Error clearing notification:", error)
      void fetchNotifications()
    })
  }, [currentBusiness, fetchNotifications, notifications])

  useEffect(() => {
    if (currentBusiness) {
      fetchNotifications()
      
      // Refresh notifications every 5 minutes
      const interval = setInterval(fetchNotifications, 5 * 60 * 1000)
      return () => clearInterval(interval)
    }

    setNotifications([])
    setStats(buildStats([]))
    setIsLoading(false)
  }, [currentBusiness, fetchNotifications])

  return {
    notifications,
    stats,
    isLoading,
    preferences,
    updatePreferences,
    markAsRead,
    markAllAsRead,
    clearNotification,
    refresh: fetchNotifications,
  }
}
