"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { useNotifications } from "@/hooks/useNotifications"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
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
  Settings, 
  Palette, 
  Sun, 
  Moon, 
  Monitor,
  Bell,
  Package,
  AlertTriangle,
  FileText,
  Wallet,
  CheckCircle,
  Info,
} from "lucide-react"
import { toast } from "sonner"

export function PreferencesPage() {
  const { theme, setTheme } = useTheme()
  const { preferences, updatePreferences } = useNotifications()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleNotificationToggle = (enabled: boolean) => {
    updatePreferences({ ...preferences, enabled })
    toast.success(enabled ? "Notifications enabled" : "Notifications disabled")
  }

  const handleNotificationTypeToggle = (type: keyof typeof preferences.types, enabled: boolean) => {
    updatePreferences({
      ...preferences,
      types: { ...preferences.types, [type]: enabled },
    })
  }

  if (!mounted) {
    return null
  }

  const notificationTypes = [
    {
      key: "out_of_stock" as const,
      label: "Out of Stock",
      description: "Alert when items are completely out of stock",
      icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
    },
    {
      key: "low_stock" as const,
      label: "Low Stock",
      description: "Alert when items fall below threshold",
      icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
    },
    {
      key: "invoice_overdue" as const,
      label: "Overdue Invoices",
      description: "Alert for invoices past due date",
      icon: <FileText className="h-5 w-5 text-red-500" />,
    },
    {
      key: "payment_due" as const,
      label: "Pending Payments",
      description: "Alert for unreconciled payments",
      icon: <Wallet className="h-5 w-5 text-blue-500" />,
    },
    {
      key: "payment_received" as const,
      label: "Payment Received",
      description: "Notify when payments are received",
      icon: <CheckCircle className="h-5 w-5 text-green-500" />,
    },
    {
      key: "stock_alert" as const,
      label: "Stock Alerts",
      description: "General stock-related notifications",
      icon: <Package className="h-5 w-5" />,
    },
    {
      key: "system" as const,
      label: "System Notifications",
      description: "Important system updates and messages",
      icon: <Info className="h-5 w-5 text-blue-500" />,
    },
    {
      key: "info" as const,
      label: "Information",
      description: "General information and tips",
      icon: <Info className="h-5 w-5" />,
    },
  ]

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
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/settings">Settings</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Preferences</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          {/* Main Content */}
          <div className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6 pb-20 md:pb-6">
            {/* Page Header */}
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 rounded-xl bg-primary/10 border-2 border-primary/20 shrink-0">
                <Settings className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Preferences</h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                  Customize your application experience
                </p>
              </div>
            </div>

            {/* Theme Settings */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <Palette className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base md:text-lg">Appearance</CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                      Choose how the application looks to you
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Theme Mode</Label>
                    <p className="text-xs text-muted-foreground mt-1 mb-4">
                      Select your preferred color scheme
                    </p>
                  </div>

                  <RadioGroup value={theme} onValueChange={setTheme} className="grid gap-4">
                    {/* Light Theme */}
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="light" id="light" />
                      <Label
                        htmlFor="light"
                        className="flex items-center gap-3 cursor-pointer flex-1"
                      >
                        <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                          <Sun className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">Light</div>
                          <div className="text-xs text-muted-foreground">
                            Bright and clear interface
                          </div>
                        </div>
                      </Label>
                    </div>

                    {/* Dark Theme */}
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="dark" id="dark" />
                      <Label
                        htmlFor="dark"
                        className="flex items-center gap-3 cursor-pointer flex-1"
                      >
                        <div className="p-2 rounded-lg bg-slate-800 dark:bg-slate-700 border border-slate-700 dark:border-slate-600">
                          <Moon className="h-5 w-5 text-slate-300" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">Dark</div>
                          <div className="text-xs text-muted-foreground">
                            Easy on the eyes in low light
                          </div>
                        </div>
                      </Label>
                    </div>

                    {/* System Theme */}
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="system" id="system" />
                      <Label
                        htmlFor="system"
                        className="flex items-center gap-3 cursor-pointer flex-1"
                      >
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                          <Monitor className="h-5 w-5 text-blue-600 dark:text-blue-500" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">System</div>
                          <div className="text-xs text-muted-foreground">
                            Automatically match your device settings
                          </div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>

                  {/* Current Theme Display */}
                  <div className="mt-6 p-4 rounded-lg bg-muted border">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="font-medium">Current theme:</div>
                      <div className="flex items-center gap-2">
                        {theme === "light" && (
                          <>
                            <Sun className="h-4 w-4 text-yellow-600" />
                            <span>Light Mode</span>
                          </>
                        )}
                        {theme === "dark" && (
                          <>
                            <Moon className="h-4 w-4 text-slate-400" />
                            <span>Dark Mode</span>
                          </>
                        )}
                        {theme === "system" && (
                          <>
                            <Monitor className="h-4 w-4 text-blue-600" />
                            <span>System Default</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <Bell className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base md:text-lg">Notifications</CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                      Manage your notification preferences
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Master Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                    <div className="flex-1">
                      <Label htmlFor="notifications-enabled" className="text-sm font-medium cursor-pointer">
                        Enable Notifications
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Turn all notifications on or off
                      </p>
                    </div>
                    <Switch
                      id="notifications-enabled"
                      checked={preferences.enabled}
                      onCheckedChange={handleNotificationToggle}
                    />
                  </div>

                  {/* Individual Notification Types */}
                  {preferences.enabled && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Notification Types</Label>
                      <div className="space-y-3">
                        {notificationTypes.map((type) => (
                          <div
                            key={type.key}
                            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div className="shrink-0">{type.icon}</div>
                              <div className="flex-1 min-w-0">
                                <Label
                                  htmlFor={`notif-${type.key}`}
                                  className="text-sm font-medium cursor-pointer"
                                >
                                  {type.label}
                                </Label>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {type.description}
                                </p>
                              </div>
                            </div>
                            <Switch
                              id={`notif-${type.key}`}
                              checked={preferences.types[type.key]}
                              onCheckedChange={(checked) =>
                                handleNotificationTypeToggle(type.key, checked)
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Info Message */}
                  {!preferences.enabled && (
                    <div className="p-4 rounded-lg bg-muted border">
                      <p className="text-sm text-muted-foreground">
                        Notifications are currently disabled. Enable them to receive important alerts about your business.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Future Settings Placeholder */}
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">More preferences coming soon...</p>
                  <p className="text-xs mt-1">Language, notifications, and more</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </PageLayout>
      </SidebarInset>
    </SidebarProvider>
  )
}
