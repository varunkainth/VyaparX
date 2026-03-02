"use client"

import { useState, useEffect, useCallback } from "react"
import { useBusinessStore } from "@/store/useBusinessStore"
import { inventoryService } from "@/services/inventory.service"
import { invoiceService } from "@/services/invoice.service"
import { paymentService } from "@/services/payment.service"
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

  const generateNotifications = useCallback(async () => {
    if (!currentBusiness) return []

    const newNotifications: Notification[] = []

    try {
      // Check for low stock items
      const inventory = await inventoryService.listItems(currentBusiness.id, {
        include_inactive: false,
      })

      inventory.forEach((item) => {
        if (item.current_stock <= 0) {
          newNotifications.push({
            id: `out-of-stock-${item.id}`,
            type: "out_of_stock",
            priority: "urgent",
            title: "Out of Stock",
            message: `${item.name} is out of stock`,
            link: `/inventory/${item.id}`,
            read: false,
            created_at: new Date().toISOString(),
            metadata: {
              item_id: item.id,
              item_name: item.name,
              current_stock: item.current_stock,
              threshold: item.low_stock_threshold,
            },
          })
        } else if (item.current_stock <= (item.low_stock_threshold || 0)) {
          newNotifications.push({
            id: `low-stock-${item.id}`,
            type: "low_stock",
            priority: "high",
            title: "Low Stock Alert",
            message: `${item.name} is running low (${item.current_stock} ${item.unit} remaining)`,
            link: `/inventory/${item.id}`,
            read: false,
            created_at: new Date().toISOString(),
            metadata: {
              item_id: item.id,
              item_name: item.name,
              current_stock: item.current_stock,
              threshold: item.low_stock_threshold,
            },
          })
        }
      })

      // Check for overdue invoices
      const invoices = await invoiceService.listInvoices(currentBusiness.id, {
        include_cancelled: false,
      })

      const today = new Date()
      invoices.items.forEach((invoice) => {
        if (
          invoice.due_date &&
          invoice.payment_status !== "paid" &&
          new Date(invoice.due_date) < today
        ) {
          newNotifications.push({
            id: `overdue-invoice-${invoice.id}`,
            type: "invoice_overdue",
            priority: "high",
            title: "Invoice Overdue",
            message: `Invoice ${invoice.invoice_number} is overdue`,
            link: `/invoices/${invoice.id}`,
            read: false,
            created_at: new Date().toISOString(),
            metadata: {
              invoice_id: invoice.id,
              invoice_number: invoice.invoice_number,
              amount: invoice.balance_due,
            },
          })
        }
      })

      // Check for unreconciled payments
      const paymentsResponse = await paymentService.listPayments(currentBusiness.id, {
        is_reconciled: false,
      })

      if (paymentsResponse.items.length > 0) {
        newNotifications.push({
          id: `unreconciled-payments`,
          type: "payment_due",
          priority: "medium",
          title: "Pending Payments",
          message: `You have ${paymentsResponse.items.length} payment(s) pending verification`,
          link: `/payments`,
          read: false,
          created_at: new Date().toISOString(),
          metadata: {
            count: paymentsResponse.items.length,
          },
        })
      }
    } catch (error) {
      console.error("Error generating notifications:", error)
    }

    return newNotifications
  }, [currentBusiness])

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

      const newNotifications = await generateNotifications()
      
      // Filter notifications based on preferences
      const filteredNotifications = newNotifications.filter(
        (notif) => preferences.types[notif.type]
      )
      
      // Merge with existing read status from localStorage
      const storedReadIds = JSON.parse(
        localStorage.getItem("readNotifications") || "[]"
      ) as string[]

      const mergedNotifications = filteredNotifications.map((notif) => ({
        ...notif,
        read: storedReadIds.includes(notif.id),
      }))

      setNotifications(mergedNotifications)

      // Calculate stats
      const newStats: NotificationStats = {
        total: mergedNotifications.length,
        unread: mergedNotifications.filter((n) => !n.read).length,
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

      mergedNotifications.forEach((notif) => {
        newStats.by_type[notif.type]++
        newStats.by_priority[notif.priority]++
      })

      setStats(newStats)
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setIsLoading(false)
    }
  }, [generateNotifications, preferences])

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    )

    // Update localStorage
    const storedReadIds = JSON.parse(
      localStorage.getItem("readNotifications") || "[]"
    ) as string[]
    if (!storedReadIds.includes(notificationId)) {
      storedReadIds.push(notificationId)
      localStorage.setItem("readNotifications", JSON.stringify(storedReadIds))
    }

    // Update stats
    setStats((prev) => ({
      ...prev,
      unread: Math.max(0, prev.unread - 1),
    }))
  }, [])

  const markAllAsRead = useCallback(() => {
    const allIds = notifications.map((n) => n.id)
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })))
    localStorage.setItem("readNotifications", JSON.stringify(allIds))
    setStats((prev) => ({ ...prev, unread: 0 }))
  }, [notifications])

  const clearNotification = useCallback((notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
    setStats((prev) => ({
      ...prev,
      total: prev.total - 1,
      unread: prev.unread - (notifications.find((n) => n.id === notificationId)?.read ? 0 : 1),
    }))
  }, [notifications])

  useEffect(() => {
    if (currentBusiness) {
      fetchNotifications()
      
      // Refresh notifications every 5 minutes
      const interval = setInterval(fetchNotifications, 5 * 60 * 1000)
      return () => clearInterval(interval)
    }
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
