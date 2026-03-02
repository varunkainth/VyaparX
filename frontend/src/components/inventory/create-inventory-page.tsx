"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createInventorySchema, type CreateInventoryFormData } from "@/validators/inventory.validator"
import { inventoryService } from "@/services/inventory.service"
import { useBusinessStore } from "@/store/useBusinessStore"
import { INVENTORY_UNITS, GST_RATES } from "@/types/inventory"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/error-handler"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
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
  Barcode,
  FileText,
  AlertCircle
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

export function CreateInventoryPage() {
  const router = useRouter()
  const { currentBusiness } = useBusinessStore()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<CreateInventoryFormData>({
    resolver: zodResolver(createInventorySchema),
    defaultValues: {
      name: "",
      sku: "",
      hsn_code: "",
      description: "",
      unit: "PCS",
      gst_rate: 18,
      purchase_price: 0,
      selling_price: 0,
      low_stock_threshold: 10,
      opening_stock: 0,
      opening_stock_note: "",
    },
  })

  const unit = watch("unit")
  const gstRate = watch("gst_rate")
  const purchasePrice = watch("purchase_price")
  const sellingPrice = watch("selling_price")

  const calculateMargin = () => {
    if (purchasePrice && sellingPrice && sellingPrice > purchasePrice) {
      return (((sellingPrice - purchasePrice) / purchasePrice) * 100).toFixed(2)
    }
    return "0.00"
  }

  const onSubmit = async (data: CreateInventoryFormData) => {
    if (!currentBusiness) {
      toast.error("Please select a business first")
      return
    }

    try {
      // Clean up empty strings
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== "")
      ) as CreateInventoryFormData

      await inventoryService.createItem(currentBusiness.id, cleanData)
      toast.success("Inventory item created successfully!")
      router.push("/inventory")
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage)
    }
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
                  <BreadcrumbPage>Create Item</BreadcrumbPage>
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
              <div className="p-3 rounded-xl bg-primary/10 border-2 border-primary/20">
                <Package className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Create Inventory Item</h1>
                <p className="text-muted-foreground mt-1">
                  Add a new product to your inventory
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => router.push("/inventory")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Inventory
            </Button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Basic Information */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Basic Information</CardTitle>
                      <CardDescription>Item details and identification</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="name">
                        Item Name <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Enter item name"
                        {...register("name")}
                        disabled={isSubmitting}
                      />
                      {errors.name && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.name.message}
                        </p>
                      )}
                    </Field>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="sku">SKU</FieldLabel>
                        <div className="relative">
                          <Barcode className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="sku"
                            type="text"
                            placeholder="Stock Keeping Unit"
                            {...register("sku")}
                            disabled={isSubmitting}
                            className="pl-10"
                          />
                        </div>
                        {errors.sku && (
                          <p className="text-sm text-destructive mt-1">
                            {errors.sku.message}
                          </p>
                        )}
                        <FieldDescription>Unique identifier for this item</FieldDescription>
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="hsn_code">HSN Code</FieldLabel>
                        <Input
                          id="hsn_code"
                          type="text"
                          placeholder="e.g., 84713000"
                          {...register("hsn_code")}
                          disabled={isSubmitting}
                        />
                        {errors.hsn_code && (
                          <p className="text-sm text-destructive mt-1">
                            {errors.hsn_code.message}
                          </p>
                        )}
                        <FieldDescription>Harmonized System of Nomenclature</FieldDescription>
                      </Field>
                    </div>

                    <Field>
                      <FieldLabel htmlFor="description">Description</FieldLabel>
                      <Textarea
                        id="description"
                        placeholder="Item description..."
                        {...register("description")}
                        disabled={isSubmitting}
                        rows={3}
                      />
                      {errors.description && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.description.message}
                        </p>
                      )}
                    </Field>
                  </FieldGroup>
                </CardContent>
              </Card>

              {/* Unit & Tax */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Percent className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Unit & Tax</CardTitle>
                      <CardDescription>Measurement and GST details</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="unit">
                        Unit <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Select
                        value={unit}
                        onValueChange={(value) => setValue("unit", value)}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {INVENTORY_UNITS.map((u) => (
                            <SelectItem key={u} value={u}>
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.unit && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.unit.message}
                        </p>
                      )}
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="gst_rate">
                        GST Rate (%) <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Select
                        value={gstRate?.toString()}
                        onValueChange={(value) => setValue("gst_rate", parseFloat(value))}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GST_RATES.map((rate) => (
                            <SelectItem key={rate} value={rate.toString()}>
                              {rate}%
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.gst_rate && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.gst_rate.message}
                        </p>
                      )}
                    </Field>
                  </FieldGroup>
                </CardContent>
              </Card>

              {/* Pricing */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Pricing</CardTitle>
                      <CardDescription>Purchase and selling prices</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="purchase_price">
                        Purchase Price <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        id="purchase_price"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...register("purchase_price", { valueAsNumber: true })}
                        disabled={isSubmitting}
                      />
                      {errors.purchase_price && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.purchase_price.message}
                        </p>
                      )}
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="selling_price">
                        Selling Price <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        id="selling_price"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...register("selling_price", { valueAsNumber: true })}
                        disabled={isSubmitting}
                      />
                      {errors.selling_price && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.selling_price.message}
                        </p>
                      )}
                    </Field>

                    {purchasePrice > 0 && sellingPrice > 0 && (
                      <div className="p-3 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground">Profit Margin</p>
                        <p className="text-lg font-semibold text-green-600">
                          {calculateMargin()}%
                        </p>
                      </div>
                    )}
                  </FieldGroup>
                </CardContent>
              </Card>

              {/* Stock Information */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Stock Information</CardTitle>
                      <CardDescription>Opening stock and threshold settings</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="opening_stock">Opening Stock</FieldLabel>
                        <Input
                          id="opening_stock"
                          type="number"
                          step="10"
                          placeholder="0"
                          {...register("opening_stock", { valueAsNumber: true })}
                          disabled={isSubmitting}
                        />
                        {errors.opening_stock && (
                          <p className="text-sm text-destructive mt-1">
                            {errors.opening_stock.message}
                          </p>
                        )}
                        <FieldDescription>Initial stock quantity</FieldDescription>
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="low_stock_threshold">Low Stock Alert</FieldLabel>
                        <Input
                          id="low_stock_threshold"
                          type="number"
                          step="10"
                          placeholder="10"
                          {...register("low_stock_threshold", { valueAsNumber: true })}
                          disabled={isSubmitting}
                        />
                        {errors.low_stock_threshold && (
                          <p className="text-sm text-destructive mt-1">
                            {errors.low_stock_threshold.message}
                          </p>
                        )}
                        <FieldDescription>Alert when stock falls below this</FieldDescription>
                      </Field>
                    </div>

                    <Field>
                      <FieldLabel htmlFor="opening_stock_note">Opening Stock Note</FieldLabel>
                      <Textarea
                        id="opening_stock_note"
                        placeholder="Note about opening stock..."
                        {...register("opening_stock_note")}
                        disabled={isSubmitting}
                        rows={2}
                      />
                      {errors.opening_stock_note && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.opening_stock_note.message}
                        </p>
                      )}
                    </Field>
                  </FieldGroup>
                </CardContent>
              </Card>
            </div>

            {/* Submit Section */}
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Save className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-semibold">Create Item</p>
                      <p className="text-sm text-muted-foreground">
                        Add this item to your inventory
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push("/inventory")}
                      disabled={isSubmitting}
                      className="flex-1 md:flex-none"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 md:flex-none min-w-[160px]"
                    >
                      {isSubmitting ? "Creating..." : "Create Item"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
