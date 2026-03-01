"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useBusinessStore } from "@/store/useBusinessStore"
import { inventoryService } from "@/services/inventory.service"
import type { InventoryItem } from "@/types/inventory"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/error-handler"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Package, 
  Search, 
  AlertTriangle,
  RefreshCw,
  TrendingUp
} from "lucide-react"
import { AppSidebar } from "@/components/layout/app-sidebar"
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

export function InventoryLowStockPage() {
  const router = useRouter()
  const { currentBusiness } = useBusinessStore()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (currentBusiness) {
      fetchItems()
    }
  }, [currentBusiness])

  useEffect(() => {
    filterItems()
  }, [items, searchQuery])

  const fetchItems = async () => {
    if (!currentBusiness) return

    setIsLoading(true)
    try {
      const data = await inventoryService.listItems(currentBusiness.id, {
        include_inactive: false,
      })
      // Filter only low stock items
      const lowStockItems = data.filter((item) => item.current_stock < item.low_stock_threshold)
      setItems(lowStockItems)
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const filterItems = () => {
    let filtered = items

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.sku?.toLowerCase().includes(query) ||
          item.hsn_code?.toLowerCase().includes(query)
      )
    }

    setFilteredItems(filtered)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount)
  }

  const calculateTotalValue = () => {
    return items.reduce((sum, item) => sum + (item.current_stock * item.selling_price), 0)
  }

  const getStockDeficit = (item: InventoryItem) => {
    return item.low_stock_threshold - item.current_stock
  }

  const getTotalDeficit = () => {
    return items.reduce((sum, item) => sum + getStockDeficit(item), 0)
  }

  if (!currentBusiness) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex min-h-screen items-center justify-center">
            <p className="text-muted-foreground">Please select a business first</p>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header */}
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
                  <BreadcrumbLink href="/inventory">Inventory</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Low Stock Alert</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex flex-1 flex-col gap-6 p-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800">
                <AlertTriangle className="h-8 w-8 text-orange-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Low Stock Alert</h1>
                <p className="text-muted-foreground mt-1">
                  Items that need restocking
                </p>
              </div>
            </div>
            <Button onClick={fetchItems} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-orange-200 dark:border-orange-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{items.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Require immediate attention
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Stock Deficit</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getTotalDeficit().toFixed(0)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Units needed to reach threshold
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Value</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(calculateTotalValue())}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  At selling price
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, SKU, or HSN code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Items List */}
          <Card>
            <CardHeader>
              <CardTitle>Low Stock Items ({filteredItems.length})</CardTitle>
              <CardDescription>
                Click on an item to adjust stock levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery
                      ? "No items found matching your search"
                      : items.length === 0
                      ? "Great! No items are running low on stock."
                      : "No items found"}
                  </p>
                  {items.length === 0 && (
                    <Button
                      onClick={() => router.push("/inventory")}
                      className="mt-4"
                      variant="outline"
                    >
                      View All Inventory
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => router.push(`/inventory/${item.id}`)}
                      className="flex items-center justify-between p-4 border-2 border-orange-200 dark:border-orange-800 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/20">
                          <AlertTriangle className="h-5 w-5 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{item.name}</p>
                            <Badge variant="destructive" className="text-xs">
                              Low Stock
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            {item.sku && <span>SKU: {item.sku}</span>}
                            {item.hsn_code && <span>HSN: {item.hsn_code}</span>}
                            <span>Unit: {item.unit}</span>
                            <span className="text-orange-600 font-medium">
                              Need {getStockDeficit(item).toFixed(0)} more {item.unit}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-sm text-muted-foreground">Current / Threshold</p>
                        <p className="font-semibold text-lg text-orange-600">
                          {item.current_stock} / {item.low_stock_threshold} {item.unit}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(item.selling_price)}/{item.unit}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
