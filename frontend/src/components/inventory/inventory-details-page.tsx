"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { 
  updateInventorySchema, 
  adjustStockSchema,
  type UpdateInventoryFormData,
  type AdjustStockFormData 
} from "@/validators/inventory.validator"
import { inventoryService } from "@/services/inventory.service"
import { useBusinessStore } from "@/store/useBusinessStore"
import type { InventoryItem } from "@/types/inventory"
import { INVENTORY_UNITS, GST_RATES } from "@/types/inventory"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/error-handler"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Badge } from "@/components/ui/badge"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Package, 
  DollarSign, 
  Percent, 
  Save,
  ArrowLeft,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Plus,
  Minus,
  Barcode,
  FileText
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface InventoryDetailsPageProps {
  itemId: string
}

export function InventoryDetailsPage({ itemId }: InventoryDetailsPageProps) {
  const router = useRouter()
  const { currentBusiness } = useBusinessStore()
  const [item, setItem] = useState<InventoryItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showStockDialog, setShowStockDialog] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
    watch,
    setValue,
  } = useForm<UpdateInventoryFormData>({
    resolver: zodResolver(updateInventorySchema),
    defaultValues: {
      name: "",
      sku: "",
      hsn_code: "",
      description: "",
      unit: "PCS",
      gst_rate: 18,
      purchase_price: 0,
      selling_price: 0,
      low_stock_threshold: 0,
    },
  })

  const stockForm = useForm<AdjustStockFormData>({
    resolver: zodResolver(adjustStockSchema),
    defaultValues: {
      direction: "in",
      quantity: 0,
      unit_price: 0,
      notes: "",
    },
  })

  const unit = watch("unit")
  const gstRate = watch("gst_rate")
  const purchasePrice = watch("purchase_price")
  const sellingPrice = watch("selling_price")

  useEffect(() => {
    if (currentBusiness && itemId) {
      fetchItem()
    }
  }, [currentBusiness, itemId])

  const fetchItem = async () => {
    if (!currentBusiness) return

    setIsLoading(true)
    try {
      const data = await inventoryService.getItem(currentBusiness.id, itemId)
      setItem(data)
      
      reset({
        name: data.name,
        sku: data.sku || "",
        hsn_code: data.hsn_code || "",
        description: data.description || "",
        unit: data.unit,
        gst_rate: data.gst_rate,
        purchase_price: data.purchase_price,
        selling_price: data.selling_price,
        low_stock_threshold: data.low_stock_threshold,
      })
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage)
      router.push("/inventory")
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: UpdateInventoryFormData) => {
    if (!currentBusiness || !item) return

    try {
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== "")
      ) as UpdateInventoryFormData

      const updatedItem = await inventoryService.updateItem(
        currentBusiness.id,
        item.id,
        cleanData
      )
      
      setItem(updatedItem)
      setIsEditing(false)
      toast.success("Item updated successfully!")
      reset(data)
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage)
    }
  }

  const onAdjustStock = async (data: AdjustStockFormData) => {
    if (!currentBusiness || !item) return

    try {
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== "")
      ) as AdjustStockFormData

      const updatedItem = await inventoryService.adjustStock(
        currentBusiness.id,
        item.id,
        cleanData
      )
      
      setItem(updatedItem)
      setShowStockDialog(false)
      stockForm.reset()
      toast.success(`Stock ${data.direction === "in" ? "added" : "removed"} successfully!`)
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage)
    }
  }

  const handleDelete = async () => {
    if (!currentBusiness || !item) return

    setIsDeleting(true)
    try {
      await inventoryService.deleteItem(currentBusiness.id, item.id)
      toast.success("Item deleted successfully!")
      router.push("/inventory")
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage)
    } finally {
      setIsDeleting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount)
  }

  const calculateMargin = () => {
    const purchase = purchasePrice || item?.purchase_price || 0
    const selling = sellingPrice || item?.selling_price || 0
    if (purchase && selling && selling > purchase) {
      return (((selling - purchase) / purchase) * 100).toFixed(2)
    }
    return "0.00"
  }

  const calculateStockValue = () => {
    if (!item) return 0
    return item.current_stock * item.selling_price
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

  if (isLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-center space-y-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
              <p className="text-muted-foreground">Loading item details...</p>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  if (!item) {
    return null
  }

  const isLowStock = item.current_stock < item.low_stock_threshold

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <PageLayout onRefresh={fetchItem}>
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
                  <BreadcrumbLink href="/inventory">Inventory</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{item.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        {/* Main Content - Mobile Optimized */}
        <div className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6 pb-20 md:pb-6">
          {/* Page Header - Mobile Optimized */}
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 md:gap-4">
              <div className="p-2 md:p-3 rounded-xl bg-primary/10 border-2 border-primary/20 flex-shrink-0">
                <Package className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight truncate">{item.name}</h1>
                  {isLowStock && (
                    <Badge variant="destructive">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Low Stock
                    </Badge>
                  )}
                  {!item.is_active && (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </div>
                <p className="text-sm md:text-base text-muted-foreground mt-1 truncate">
                  {item.sku && `SKU: ${item.sku}`}
                  {item.hsn_code && ` • HSN: ${item.hsn_code}`}
                </p>
              </div>
            </div>
            
            {/* Mobile Action Buttons */}
            <div className="flex flex-col gap-2 md:hidden">
              <Button 
                variant="outline" 
                onClick={() => router.push("/inventory")}
                className="w-full cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Inventory
              </Button>
              
              {!isEditing && (
                <>
                  <AlertDialog open={showStockDialog} onOpenChange={setShowStockDialog}>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="w-full cursor-pointer">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Adjust Stock
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-[95vw] sm:max-w-lg">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Adjust Stock</AlertDialogTitle>
                        <AlertDialogDescription>
                          Add or remove stock for {item.name}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <form onSubmit={stockForm.handleSubmit(onAdjustStock)} className="space-y-4">
                        <Field>
                          <FieldLabel>Direction</FieldLabel>
                          <Select
                            value={stockForm.watch("direction")}
                            onValueChange={(value) => stockForm.setValue("direction", value as "in" | "out")}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="in">
                                <div className="flex items-center gap-2">
                                  <Plus className="h-4 w-4 text-green-600" />
                                  Stock In (Add)
                                </div>
                              </SelectItem>
                              <SelectItem value="out">
                                <div className="flex items-center gap-2">
                                  <Minus className="h-4 w-4 text-red-600" />
                                  Stock Out (Remove)
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>

                        <Field>
                          <FieldLabel>Quantity</FieldLabel>
                          <Input
                            type="number"
                            step="1"
                            {...stockForm.register("quantity", { valueAsNumber: true })}
                          />
                          {stockForm.formState.errors.quantity && (
                            <p className="text-sm text-destructive">
                              {stockForm.formState.errors.quantity.message}
                            </p>
                          )}
                        </Field>

                        <Field>
                          <FieldLabel>Unit Price (Optional)</FieldLabel>
                          <Input
                            type="number"
                            step="0.01"
                            {...stockForm.register("unit_price", { valueAsNumber: true })}
                          />
                        </Field>

                        <Field>
                          <FieldLabel>Notes</FieldLabel>
                          <Textarea
                            {...stockForm.register("notes")}
                            rows={2}
                          />
                        </Field>

                        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                          <AlertDialogCancel type="button" className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                          <Button type="submit" disabled={stockForm.formState.isSubmitting} className="w-full sm:w-auto">
                            {stockForm.formState.isSubmitting ? "Adjusting..." : "Adjust Stock"}
                          </Button>
                        </AlertDialogFooter>
                      </form>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button onClick={() => setIsEditing(true)} className="w-full cursor-pointer">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Item
                  </Button>
                </>
              )}
            </div>

            {/* Desktop Action Buttons */}
            <div className="hidden md:flex gap-2 justify-end">
              <Button variant="outline" onClick={() => router.push("/inventory")} className="cursor-pointer">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              {!isEditing && (
                <>
                  <AlertDialog open={showStockDialog} onOpenChange={setShowStockDialog}>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="cursor-pointer">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Adjust Stock
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Adjust Stock</AlertDialogTitle>
                        <AlertDialogDescription>
                          Add or remove stock for {item.name}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <form onSubmit={stockForm.handleSubmit(onAdjustStock)} className="space-y-4">
                        <Field>
                          <FieldLabel>Direction</FieldLabel>
                          <Select
                            value={stockForm.watch("direction")}
                            onValueChange={(value) => stockForm.setValue("direction", value as "in" | "out")}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="in">
                                <div className="flex items-center gap-2">
                                  <Plus className="h-4 w-4 text-green-600" />
                                  Stock In (Add)
                                </div>
                              </SelectItem>
                              <SelectItem value="out">
                                <div className="flex items-center gap-2">
                                  <Minus className="h-4 w-4 text-red-600" />
                                  Stock Out (Remove)
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>

                        <Field>
                          <FieldLabel>Quantity</FieldLabel>
                          <Input
                            type="number"
                            step="1"
                            {...stockForm.register("quantity", { valueAsNumber: true })}
                          />
                          {stockForm.formState.errors.quantity && (
                            <p className="text-sm text-destructive">
                              {stockForm.formState.errors.quantity.message}
                            </p>
                          )}
                        </Field>

                        <Field>
                          <FieldLabel>Unit Price (Optional)</FieldLabel>
                          <Input
                            type="number"
                            step="0.01"
                            {...stockForm.register("unit_price", { valueAsNumber: true })}
                          />
                        </Field>

                        <Field>
                          <FieldLabel>Notes</FieldLabel>
                          <Textarea
                            {...stockForm.register("notes")}
                            rows={2}
                          />
                        </Field>

                        <AlertDialogFooter>
                          <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
                          <Button type="submit" disabled={stockForm.formState.isSubmitting}>
                            {stockForm.formState.isSubmitting ? "Adjusting..." : "Adjust Stock"}
                          </Button>
                        </AlertDialogFooter>
                      </form>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button onClick={() => setIsEditing(true)} className="cursor-pointer">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Stock Cards - Mobile Optimized */}
          <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Stock</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-lg sm:text-xl md:text-2xl font-bold ${isLowStock ? "text-orange-600" : ""}`}>
                  {item.current_stock} {item.unit}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Alert: {item.low_stock_threshold}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-xl md:text-2xl font-bold">
                  {formatCurrency(calculateStockValue())}
                </div>
                <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
                  At selling price
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Price</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-xl md:text-2xl font-bold">
                  {formatCurrency(item.selling_price)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Per {item.unit}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Margin</CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">
                  {calculateMargin()}%
                </div>
                <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
                  Purchase: {formatCurrency(item.purchase_price)}
                </p>
              </CardContent>
            </Card>
          </div>

          {isEditing ? (
            /* Edit Form */
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {isDirty && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You have unsaved changes.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid gap-6 md:grid-cols-2">
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FieldGroup>
                      <Field>
                        <FieldLabel htmlFor="name">Item Name</FieldLabel>
                        <Input id="name" {...register("name")} disabled={isSubmitting} />
                        {errors.name && (
                          <p className="text-sm text-destructive">{errors.name.message}</p>
                        )}
                      </Field>

                      <div className="grid gap-4 md:grid-cols-2">
                        <Field>
                          <FieldLabel htmlFor="sku">SKU</FieldLabel>
                          <Input id="sku" {...register("sku")} disabled={isSubmitting} />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="hsn_code">HSN Code</FieldLabel>
                          <Input id="hsn_code" {...register("hsn_code")} disabled={isSubmitting} />
                        </Field>
                      </div>

                      <Field>
                        <FieldLabel htmlFor="description">Description</FieldLabel>
                        <Textarea id="description" {...register("description")} disabled={isSubmitting} rows={3} />
                      </Field>
                    </FieldGroup>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Unit & Tax</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FieldGroup>
                      <Field>
                        <FieldLabel>Unit</FieldLabel>
                        <Select
                          value={unit || "PCS"}
                          onValueChange={(value) => setValue("unit", value, { shouldDirty: true })}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                          <SelectContent>
                            {INVENTORY_UNITS.map((u) => (
                              <SelectItem key={u} value={u}>{u}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>

                      <Field>
                        <FieldLabel>GST Rate (%)</FieldLabel>
                        <Select
                          value={gstRate?.toString() || "18"}
                          onValueChange={(value) => setValue("gst_rate", parseFloat(value), { shouldDirty: true })}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select GST rate" />
                          </SelectTrigger>
                          <SelectContent>
                            {GST_RATES.map((rate) => (
                              <SelectItem key={rate} value={rate.toString()}>{rate}%</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </FieldGroup>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Pricing</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FieldGroup>
                      <Field>
                        <FieldLabel htmlFor="purchase_price">Purchase Price</FieldLabel>
                        <Input
                          id="purchase_price"
                          type="number"
                          step="0.01"
                          {...register("purchase_price", { valueAsNumber: true })}
                          disabled={isSubmitting}
                        />
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="selling_price">Selling Price</FieldLabel>
                        <Input
                          id="selling_price"
                          type="number"
                          step="0.01"
                          {...register("selling_price", { valueAsNumber: true })}
                          disabled={isSubmitting}
                        />
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="low_stock_threshold">Low Stock Alert</FieldLabel>
                        <Input
                          id="low_stock_threshold"
                          type="number"
                          step="10"
                          {...register("low_stock_threshold", { valueAsNumber: true })}
                          disabled={isSubmitting}
                        />
                      </Field>
                    </FieldGroup>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-2 border-primary/20 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Save className="h-5 w-5 text-primary" />
                      <p className="font-semibold">Save Changes</p>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false)
                          reset()
                        }}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting || !isDirty}>
                        {isSubmitting ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </form>
          ) : (
            /* View Mode */
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Item Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {item.description && (
                    <div>
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="text-sm">{item.description}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Unit</p>
                      <p className="font-medium">{item.unit}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">GST Rate</p>
                      <p className="font-medium">{item.gst_rate}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pricing Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Purchase Price</p>
                      <p className="font-medium">{formatCurrency(item.purchase_price)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Selling Price</p>
                      <p className="font-medium">{formatCurrency(item.selling_price)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2 border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                  <CardDescription>
                    Permanently delete this item
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={isDeleting}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Item
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete "{item.name}" and remove all associated data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
        </PageLayout>
      </SidebarInset>
    </SidebarProvider>
  )
}
