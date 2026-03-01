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
import { FloatingActionButton } from "@/components/ui/floating-action-button"
import { MobileTable, MobileTableRow, MobileTableCell } from "@/components/ui/mobile-table"
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Boxes,
  Eye
} from "lucide-react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { EmptyState } from "@/components/ui/empty-state"
import { ListSkeleton } from "@/components/ui/skeleton-loader"

export function InventoryListPage() {
  const router = useRouter()
  const { currentBusiness } = useBusinessStore()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [includeInactive, setIncludeInactive] = useState(false)
  const [showLowStock, setShowLowStock] = useState(false)

  useEffect(() => {
    if (currentBusiness) {
      fetchItems()
    }
  }, [currentBusiness, includeInactive])

  useEffect(() => {
    filterItems()
  }, [items, searchQuery, showLowStock])

  const fetchItems = async () => {
    if (!currentBusiness) return

    setIsLoading(true)
    try {
      const data = await inventoryService.listItems(currentBusiness.id, {
        include_inactive: includeInactive,
      })
      setItems(data)
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const filterItems = () => {
    let filtered = items

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.sku?.toLowerCase().includes(query) ||
          item.hsn_code?.toLowerCase().includes(query)
      )
    }

    // Filter by low stock
    if (showLowStock) {
      filtered = filtered.filter((item) => item.current_stock < item.low_stock_threshold)
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

  const getLowStockCount = () => {
    return items.filter((item) => item.current_stock < item.low_stock_threshold).length
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
        <PageLayout onRefresh={fetchItems}>
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
                <BreadcrumbItem>
                  <BreadcrumbPage>Inventory</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        {/* Main Content - Mobile Optimized */}
        <div className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6 pb-20 md:pb-6">
          {/* Page Header - Mobile Optimized */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 rounded-xl bg-primary/10 border-2 border-primary/20 flex-shrink-0">
                <Package className="h-5 w-5 md:h-6 md:w-6 lg:h-8 lg:w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Inventory</h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                  <span className="hidden sm:inline">Manage your products and stock</span>
                  <span className="sm:hidden">Products & stock</span>
                </p>
              </div>
            </div>
            {/* Desktop Buttons */}
            <div className="hidden md:flex gap-2">
              <Button variant="outline" onClick={() => router.push("/inventory/movements")} className="cursor-pointer">
                <TrendingUp className="h-4 w-4 mr-2" />
                View Movements
              </Button>
              <Button onClick={() => router.push("/inventory/create")} className="cursor-pointer">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </div>

          {/* Stats Cards - Mobile Optimized */}
          <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Total</CardTitle>
                <Boxes className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{items.length}</div>
              </CardContent>
            </Card>
            <Card 
              className="cursor-pointer hover:bg-accent/50 transition-colors active:scale-98"
              onClick={() => router.push("/inventory/low-stock")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Low Stock</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-orange-600">{getLowStockCount()}</div>
                <p className="text-xs text-muted-foreground mt-1 hidden sm:block">Click to view</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-xl md:text-2xl font-bold">
                  {formatCurrency(calculateTotalValue())}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Active</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">
                  {items.filter((i) => i.is_active).length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, SKU, or HSN code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="low-stock"
                      checked={showLowStock}
                      onCheckedChange={(checked) => setShowLowStock(checked as boolean)}
                    />
                    <label
                      htmlFor="low-stock"
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      Low Stock Only
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="include-inactive"
                      checked={includeInactive}
                      onCheckedChange={(checked) => setIncludeInactive(checked as boolean)}
                    />
                    <label
                      htmlFor="include-inactive"
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      Include Inactive
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items List */}
          <Card>
            <CardHeader>
              <CardTitle>All Items ({filteredItems.length})</CardTitle>
              <CardDescription>
                Click on an item to view details and manage stock
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ListSkeleton count={5} type="inventory" />
              ) : filteredItems.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title={
                    searchQuery || showLowStock
                      ? "No items found"
                      : "No inventory items yet"
                  }
                  description={
                    searchQuery || showLowStock
                      ? "Try adjusting your filters or search query to find what you're looking for."
                      : "Get started by adding your first inventory item. Track stock levels, prices, and manage your products efficiently."
                  }
                  action={
                    searchQuery || showLowStock
                      ? undefined
                      : {
                          label: "Add Item",
                          onClick: () => router.push("/inventory/create"),
                        }
                  }
                />
              ) : (
                <>
                  {/* Desktop View */}
                  <div className="hidden md:block space-y-3">
                    {filteredItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => router.push(`/inventory/${item.id}`)}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer gap-3"
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
                            <Package className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium truncate">{item.name}</p>
                              {item.current_stock < item.low_stock_threshold && (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Low Stock
                                </Badge>
                              )}
                              {!item.is_active && (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-muted-foreground">
                              {item.sku && <span>SKU: {item.sku}</span>}
                              {item.hsn_code && <span>HSN: {item.hsn_code}</span>}
                              <span>Unit: {item.unit}</span>
                              <span>GST: {item.gst_rate}%</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right space-y-1 flex-shrink-0">
                          <p className="text-sm text-muted-foreground">Stock</p>
                          <p className={`font-semibold text-lg ${item.current_stock < item.low_stock_threshold ? "text-orange-600" : ""}`}>
                            {item.current_stock} {item.unit}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(item.selling_price)}/{item.unit}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Mobile View */}
                  <MobileTable>
                    {filteredItems.map((item) => (
                      <MobileTableRow key={item.id} onClick={() => router.push(`/inventory/${item.id}`)}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.name}</p>
                            {item.sku && (
                              <p className="text-xs text-muted-foreground mt-0.5">SKU: {item.sku}</p>
                            )}
                          </div>
                          <div className="flex gap-1.5 flex-shrink-0 ml-2">
                            {item.current_stock < item.low_stock_threshold && (
                              <Badge variant="destructive" className="text-xs">
                                Low
                              </Badge>
                            )}
                            {!item.is_active && (
                              <Badge variant="secondary" className="text-xs">Inactive</Badge>
                            )}
                          </div>
                        </div>
                        <MobileTableCell label="Stock">
                          <span className={`font-semibold ${item.current_stock < item.low_stock_threshold ? "text-orange-600" : ""}`}>
                            {item.current_stock} {item.unit}
                          </span>
                        </MobileTableCell>
                        <MobileTableCell label="Price">
                          <span className="font-medium">{formatCurrency(item.selling_price)}/{item.unit}</span>
                        </MobileTableCell>
                        {item.hsn_code && (
                          <MobileTableCell label="HSN">
                            {item.hsn_code}
                          </MobileTableCell>
                        )}
                        <MobileTableCell label="GST">
                          {item.gst_rate}%
                        </MobileTableCell>
                        <div className="flex gap-2 mt-3 pt-3 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/inventory/${item.id}`);
                            }}
                            className="cursor-pointer flex-1"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                      </MobileTableRow>
                    ))}
                  </MobileTable>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Mobile FAB */}
        <FloatingActionButton
          actions={[
            {
              label: "Add Item",
              icon: <Plus className="h-5 w-5" />,
              onClick: () => router.push("/inventory/create"),
            },
            {
              label: "View Movements",
              icon: <TrendingUp className="h-5 w-5" />,
              onClick: () => router.push("/inventory/movements"),
            },
            {
              label: "Low Stock",
              icon: <AlertTriangle className="h-5 w-5" />,
              onClick: () => router.push("/inventory/low-stock"),
            },
          ]}
        />
        </PageLayout>
      </SidebarInset>
    </SidebarProvider>
  )
}
