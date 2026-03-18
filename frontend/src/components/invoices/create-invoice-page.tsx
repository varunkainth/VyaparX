"use client"

import * as React from "react"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray, type FieldErrors } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createInvoiceSchema, type CreateInvoiceFormData } from "@/validators/invoice.validator"
import { invoiceService } from "@/services/invoice.service"
import { partyService } from "@/services/party.service"
import { inventoryService } from "@/services/inventory.service"
import { useBusinessStore } from "@/store/useBusinessStore"
import type { Party } from "@/types/party"
import type { InventoryItem } from "@/types/inventory"
import { INDIAN_STATES } from "@/constants/indian-states"
import { GST_RATES } from "@/types/inventory"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/error-handler"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, 
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Calculator,
  Package,
  Database
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Alert } from "@/components/ui/alert"

interface CreateInvoicePageProps {
  invoiceType: "sales" | "purchase"
}

export function CreateInvoicePage({ invoiceType }: CreateInvoicePageProps) {
  const router = useRouter()
  const { currentBusiness } = useBusinessStore()
  const [parties, setParties] = useState<Party[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [isLoadingParties, setIsLoadingParties] = useState(true)
  const [isLoadingInventory, setIsLoadingInventory] = useState(true)
  const [selectedPartyState, setSelectedPartyState] = useState<string>("")

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    control,
  } = useForm<CreateInvoiceFormData>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      invoice_date: new Date().toISOString().split('T')[0],
      place_of_supply: "",
      is_igst: false,
      price_mode: "exclusive" as const,
      round_off_enabled: false,
      round_off: 0,
      items: [
        {
          item_name: "",
          unit: "PCS",
          quantity: 1,
          unit_price: 0,
          discount_pct: 0,
          gst_rate: 18,
        },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  })

  const watchItems = watch("items")
  const watchPartyId = watch("party_id")
  const watchPlaceOfSupply = watch("place_of_supply")
  const watchPriceMode = watch("price_mode")
  const watchRoundOffEnabled = watch("round_off_enabled")

  const fetchParties = useCallback(async () => {
    if (!currentBusiness) return

    setIsLoadingParties(true)
    try {
      const data = await partyService.listParties(currentBusiness.id, {
        include_inactive: false,
      })
      // Filter based on invoice type
      const filtered = invoiceType === "sales" 
        ? data.filter(p => p.party_type === "customer" || p.party_type === "both")
        : data.filter(p => p.party_type === "supplier" || p.party_type === "both")
      setParties(filtered)
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage)
    } finally {
      setIsLoadingParties(false)
    }
  }, [currentBusiness, invoiceType])

  const fetchInventory = useCallback(async () => {
    if (!currentBusiness) return

    setIsLoadingInventory(true)
    try {
      const data = await inventoryService.listItems(currentBusiness.id, {
        include_inactive: false,
      })
      setInventoryItems(data)
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage)
    } finally {
      setIsLoadingInventory(false)
    }
  }, [currentBusiness])

  useEffect(() => {
    if (currentBusiness) {
      // Fetch both parties and inventory in parallel
      Promise.all([fetchParties(), fetchInventory()])
      
      // Set default place of supply to business state
      if (currentBusiness.state_code) {
        setValue("place_of_supply", currentBusiness.state_code)
      }
    }
  }, [currentBusiness, fetchInventory, fetchParties, setValue])

  useEffect(() => {
    // Update IGST flag when place of supply changes
    if (currentBusiness?.state_code && watchPlaceOfSupply) {
      const isIgst = currentBusiness.state_code !== watchPlaceOfSupply
      setValue("is_igst", isIgst)
    }
  }, [watchPlaceOfSupply, currentBusiness])

  useEffect(() => {
    // Update party state when party is selected
    if (watchPartyId) {
      const party = parties.find(p => p.id === watchPartyId)
      if (party?.state_code) {
        setSelectedPartyState(party.state_code)
        setValue("place_of_supply", party.state_code)
      }
    }
  }, [watchPartyId, parties])

  const handleItemSelect = (index: number, itemId: string) => {
    const item = inventoryItems.find(i => i.id === itemId)
    if (item) {
      setValue(`items.${index}.item_id`, item.id)
      setValue(`items.${index}.item_name`, item.name)
      setValue(`items.${index}.hsn_code`, item.hsn_code || "")
      setValue(`items.${index}.unit`, item.unit)
      setValue(`items.${index}.unit_price`, invoiceType === "sales" ? item.selling_price : item.purchase_price)
      setValue(`items.${index}.gst_rate`, item.gst_rate)
    }
  }

  const handleAddToMasterInventory = async (index: number) => {
    if (!currentBusiness) return

    const item = watchItems[index]
    if (!item || item.item_id) {
      toast.error("This item is already in the master inventory")
      return
    }

    if (!item.item_name || !item.unit_price) {
      toast.error("Please fill in item name and unit price before adding to inventory")
      return
    }

    try {
      const inventoryData = {
        name: item.item_name,
        sku: item.hsn_code || "",
        hsn_code: item.hsn_code || "",
        description: item.description || "",
        unit: item.unit || "PCS",
        gst_rate: item.gst_rate || 18,
        purchase_price: item.unit_price,
        selling_price: item.unit_price * 1.2, // Default 20% markup
        low_stock_threshold: 10,
        opening_stock: 0,
      }

      const newItem = await inventoryService.createItem(currentBusiness.id, inventoryData)
      
      // Update the item in the form to link it to the newly created inventory item
      setValue(`items.${index}.item_id`, newItem.id)
      
      // Refresh inventory list
      await fetchInventory()
      
      toast.success(`"${item.item_name}" added to master inventory!`)
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(`Failed to add to inventory: ${errorMessage}`)
    }
  }

  const calculateItemTotal = (index: number) => {
    const item = watchItems[index]
    if (!item) return 0

    const quantity = item.quantity || 0
    const unitPrice = item.unit_price || 0
    const discountPct = item.discount_pct || 0
    const gstRate = item.gst_rate || 0
    const priceMode = watchPriceMode || "exclusive"

    const round2 = (num: number) => Math.round(num * 100) / 100

    // Match backend logic exactly
    const grossAmount = round2(quantity * unitPrice)
    const divisor = 1 + gstRate / 100
    const exclusiveBase = priceMode === "inclusive" ? round2(grossAmount / divisor) : grossAmount
    const discountAmount = round2(exclusiveBase * (discountPct / 100))
    const taxableValue = round2(exclusiveBase - discountAmount)
    
    const cgstRate = watch("is_igst") ? 0 : round2(gstRate / 2)
    const sgstRate = watch("is_igst") ? 0 : round2(gstRate / 2)
    const igstRate = watch("is_igst") ? round2(gstRate) : 0
    
    const cgstAmount = round2((taxableValue * cgstRate) / 100)
    const sgstAmount = round2((taxableValue * sgstRate) / 100)
    const igstAmount = round2((taxableValue * igstRate) / 100)
    
    return round2(taxableValue + cgstAmount + sgstAmount + igstAmount)
  }

  const calculateTotals = () => {
    const round2 = (num: number) => Math.round(num * 100) / 100
    const priceMode = watchPriceMode || "exclusive"
    
    let subtotal = 0
    let totalDiscount = 0
    let taxableAmount = 0
    let totalTax = 0

    watchItems.forEach((item) => {
      const quantity = item.quantity || 0
      const unitPrice = item.unit_price || 0
      const discountPct = item.discount_pct || 0
      const gstRate = item.gst_rate || 0

      // Match backend logic exactly
      const grossAmount = round2(quantity * unitPrice)
      const divisor = 1 + gstRate / 100
      const exclusiveBase = priceMode === "inclusive" ? round2(grossAmount / divisor) : grossAmount
      const discountAmount = round2(exclusiveBase * (discountPct / 100))
      const itemTaxableValue = round2(exclusiveBase - discountAmount)

      const cgstRate = watch("is_igst") ? 0 : round2(gstRate / 2)
      const sgstRate = watch("is_igst") ? 0 : round2(gstRate / 2)
      const igstRate = watch("is_igst") ? round2(gstRate) : 0

      const cgstAmount = round2((itemTaxableValue * cgstRate) / 100)
      const sgstAmount = round2((itemTaxableValue * sgstRate) / 100)
      const igstAmount = round2((itemTaxableValue * igstRate) / 100)

      subtotal += exclusiveBase
      totalDiscount += discountAmount
      taxableAmount += itemTaxableValue
      totalTax += cgstAmount + sgstAmount + igstAmount
    })

    subtotal = round2(subtotal)
    totalDiscount = round2(totalDiscount)
    taxableAmount = round2(taxableAmount)
    totalTax = round2(totalTax)
    const exactGrandTotal = round2(taxableAmount + totalTax)
    const roundOff = watchRoundOffEnabled ? round2(Math.round(exactGrandTotal) - exactGrandTotal) : 0
    const grandTotal = round2(exactGrandTotal + roundOff)

    return {
      subtotal,
      totalDiscount,
      taxableAmount,
      totalTax,
      exactGrandTotal,
      roundOff,
      grandTotal,
    }
  }

  const validateStockForSales = (): { valid: boolean; message?: string } => {
    if (invoiceType !== "sales") return { valid: true }

    const stockErrors: string[] = []

    for (const item of watchItems) {
      if (!item.item_id) continue

      const inventoryItem = inventoryItems.find((i) => i.id === item.item_id)
      if (!inventoryItem) continue

      if (inventoryItem.current_stock <= 0) {
        stockErrors.push(`${item.item_name}: Out of stock (available: ${inventoryItem.current_stock})`)
      } else if (item.quantity > inventoryItem.current_stock) {
        stockErrors.push(
          `${item.item_name}: Insufficient stock (requested: ${item.quantity}, available: ${inventoryItem.current_stock})`
        )
      }
    }

    if (stockErrors.length > 0) {
      return {
        valid: false,
        message: `Cannot create sales invoice due to stock issues:\n${stockErrors.join("\n")}`,
      }
    }

    return { valid: true }
  }

  const onSubmit = async (data: CreateInvoiceFormData) => {
    if (!currentBusiness) return

    // Validate stock for sales invoices
    if (invoiceType === "sales") {
      const stockValidation = validateStockForSales()
      if (!stockValidation.valid) {
        toast.error(stockValidation.message, {
          duration: 6000,
        })
        return
      }
    }

    try {
      const totals = calculateTotals()
      const isIgst = data.is_igst
      const priceMode = data.price_mode || "exclusive"

      // Calculate detailed fields for each item using BACKEND LOGIC
      const itemsWithCalculations = data.items.map((item) => {
        const quantity = item.quantity || 0
        const unitPrice = item.unit_price || 0
        const discountPct = item.discount_pct || 0
        const gstRate = item.gst_rate || 0

        // Backend logic: round2 helper
        const round2 = (num: number) => Math.round(num * 100) / 100

        // Step 1: Calculate gross amount
        const grossAmount = round2(quantity * unitPrice)

        // Step 2: Calculate exclusive base (before discount)
        const divisor = 1 + gstRate / 100
        const exclusiveBase = priceMode === "inclusive" ? round2(grossAmount / divisor) : grossAmount

        // Step 3: Calculate discount on exclusive base
        const discountAmount = round2(exclusiveBase * (discountPct / 100))

        // Step 4: Calculate taxable value (after discount)
        const taxableValue = round2(exclusiveBase - discountAmount)

        // Step 5: Calculate tax rates
        const cgstRate = isIgst ? 0 : round2(gstRate / 2)
        const sgstRate = isIgst ? 0 : round2(gstRate / 2)
        const igstRate = isIgst ? round2(gstRate) : 0

        // Step 6: Calculate tax amounts
        const cgstAmount = round2((taxableValue * cgstRate) / 100)
        const sgstAmount = round2((taxableValue * sgstRate) / 100)
        const igstAmount = round2((taxableValue * igstRate) / 100)

        // Step 7: Calculate total
        const totalAmount = round2(taxableValue + cgstAmount + sgstAmount + igstAmount)

        return {
          ...item,
          price_mode: priceMode,
          discount_amount: discountAmount,
          taxable_value: taxableValue,
          cgst_rate: cgstRate,
          sgst_rate: sgstRate,
          igst_rate: igstRate,
          cgst_amount: cgstAmount,
          sgst_amount: sgstAmount,
          igst_amount: igstAmount,
          total_amount: totalAmount,
        }
      })

      // Recalculate totals from the computed items
      const round2 = (num: number) => Math.round(num * 100) / 100
      
      const subtotal = round2(itemsWithCalculations.reduce((sum, item) => {
        const grossAmount = round2(item.quantity * item.unit_price)
        const divisor = 1 + item.gst_rate / 100
        const exclusiveBase = priceMode === "inclusive" ? round2(grossAmount / divisor) : grossAmount
        return sum + exclusiveBase
      }, 0))

      const totalDiscount = round2(itemsWithCalculations.reduce((sum, item) => sum + item.discount_amount, 0))
      const taxableAmount = round2(itemsWithCalculations.reduce((sum, item) => sum + item.taxable_value, 0))
      const totalTax = round2(itemsWithCalculations.reduce((sum, item) => 
        sum + item.cgst_amount + item.sgst_amount + item.igst_amount, 0))
      const exactGrandTotal = round2(itemsWithCalculations.reduce((sum, item) => sum + item.total_amount, 0))
      const roundOff = data.round_off_enabled ? round2(Math.round(exactGrandTotal) - exactGrandTotal) : 0
      const grandTotal = round2(exactGrandTotal + roundOff)

      const { round_off_enabled, ...restData } = data
      const invoiceData = {
        ...restData,
        items: itemsWithCalculations,
        subtotal,
        total_discount: totalDiscount,
        taxable_amount: taxableAmount,
        total_tax: totalTax,
        round_off: roundOff,
        grand_total: grandTotal,
      }

      if (invoiceType === "sales") {
        await invoiceService.createSalesInvoice(invoiceData)
      } else {
        await invoiceService.createPurchaseInvoice(invoiceData)

        // Auto-update inventory stock for purchase invoices
        const stockUpdatePromises = data.items
          .filter((item) => item.item_id && item.quantity > 0)
          .map(async (item) => {
            try {
              await inventoryService.adjustStock(currentBusiness.id, item.item_id!, {
                quantity: item.quantity,
                direction: "in",
                unit_price: item.unit_price,
                notes: `Stock added via purchase invoice`,
              })
              return { success: true, itemName: item.item_name }
            } catch (error) {
              return { success: false, itemName: item.item_name, error }
            }
          })

        const stockResults = await Promise.all(stockUpdatePromises)
        const successfulUpdates = stockResults.filter((r) => r.success)
        const failedUpdates = stockResults.filter((r) => !r.success)

        if (successfulUpdates.length > 0) {
          toast.success(
            `Stock updated for ${successfulUpdates.length} item(s): ${successfulUpdates.map((r) => r.itemName).join(", ")}`
          )
        }
        if (failedUpdates.length > 0) {
          toast.warning(
            `Failed to update stock for: ${failedUpdates.map((r) => r.itemName).join(", ")}. Please update manually.`
          )
        }
      }

      toast.success(`${invoiceType === "sales" ? "Sales" : "Purchase"} invoice created successfully!`)
      router.push("/invoices")
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage)
    }
  }

  const extractFirstErrorMessage = (value: unknown): string | undefined => {
    if (!value || typeof value !== "object") return undefined
    const maybeError = value as { message?: unknown }
    if (typeof maybeError.message === "string" && maybeError.message.trim().length > 0) {
      return maybeError.message
    }

    for (const nested of Object.values(value as Record<string, unknown>)) {
      const message = extractFirstErrorMessage(nested)
      if (message) return message
    }

    return undefined
  }

  const onInvalid = (formErrors: FieldErrors<CreateInvoiceFormData>) => {
    const firstError = extractFirstErrorMessage(formErrors)
    toast.error(firstError ?? "Please fill all mandatory fields correctly")
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount)
  }

  const totals = calculateTotals()

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
                  <BreadcrumbLink href="/invoices">Invoices</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    Create {invoiceType === "sales" ? "Sales" : "Purchase"}
                  </BreadcrumbPage>
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
              <div className="p-2 md:p-3 rounded-xl bg-primary/10 border-2 border-primary/20 shrink-0">
                <FileText className="h-5 w-5 md:h-6 md:w-6 lg:h-8 lg:w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
                  Create {invoiceType === "sales" ? "Sales" : "Purchase"}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                  <span className="hidden sm:inline">Add items and generate invoice</span>
                  <span className="sm:hidden">Add items</span>
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => router.push("/invoices")} className="cursor-pointer w-full sm:w-auto">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>

          <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4 md:space-y-6">
            {/* Invoice Details - Mobile Optimized */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base md:text-lg">Invoice Details</CardTitle>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field className="sm:col-span-2">
                      <FieldLabel>
                        {invoiceType === "sales" ? "Customer" : "Supplier"} <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Select
                        value={watchPartyId || ""}
                        onValueChange={(value) => setValue("party_id", value)}
                        disabled={isLoadingParties}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={`Select ${invoiceType === "sales" ? "customer" : "supplier"}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {parties.map((party) => (
                            <SelectItem key={party.id} value={party.id}>
                              {party.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.party_id && (
                        <p className="text-sm text-destructive">{errors.party_id.message}</p>
                      )}
                    </Field>

                    <Field>
                      <FieldLabel>Invoice Date <span className="text-destructive">*</span></FieldLabel>
                      <Input
                        type="date"
                        {...register("invoice_date")}
                        disabled={isSubmitting}
                      />
                      {errors.invoice_date && (
                        <p className="text-sm text-destructive">{errors.invoice_date.message}</p>
                      )}
                    </Field>

                    <Field>
                      <FieldLabel>Due Date (Optional)</FieldLabel>
                      <Input
                        type="date"
                        {...register("due_date")}
                        disabled={isSubmitting}
                      />
                    </Field>

                    <Field>
                      <FieldLabel>Place of Supply <span className="text-destructive">*</span></FieldLabel>
                      <Select
                        value={watchPlaceOfSupply || ""}
                        onValueChange={(value) => setValue("place_of_supply", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {INDIAN_STATES.map((state) => (
                            <SelectItem key={state.code} value={state.code}>
                              {state.code} - {state.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.place_of_supply && (
                        <p className="text-sm text-destructive">{errors.place_of_supply.message}</p>
                      )}
                    </Field>

                    <Field>
                      <FieldLabel>Price Mode <span className="text-destructive">*</span></FieldLabel>
                      <Select
                        value={watchPriceMode || "exclusive"}
                        onValueChange={(value) => setValue("price_mode", value as "inclusive" | "exclusive")}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="exclusive">
                            <div className="flex flex-col items-start">
                              <span className="font-medium">Tax Exclusive</span>
                              <span className="text-xs text-muted-foreground">Price + Tax</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="inclusive">
                            <div className="flex flex-col items-start">
                              <span className="font-medium">Tax Inclusive</span>
                              <span className="text-xs text-muted-foreground">Price includes Tax</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  {watchPlaceOfSupply && currentBusiness.state_code && (
                    <Alert className={
                      watchPlaceOfSupply === currentBusiness.state_code 
                        ? "border-l-4 border-l-green-500 bg-green-950/20 border-green-900/30" 
                        : "border-l-4 border-l-blue-500 bg-blue-950/20 border-blue-900/30"
                    }>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-6">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className={`p-2 sm:p-2.5 rounded-lg shrink-0 ${
                            watchPlaceOfSupply === currentBusiness.state_code 
                              ? "bg-green-500/15" 
                              : "bg-blue-500/15"
                          }`}>
                            <Calculator className={`h-4 w-4 sm:h-5 sm:w-5 ${
                              watchPlaceOfSupply === currentBusiness.state_code 
                                ? "text-green-400" 
                                : "text-blue-400"
                            }`} />
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className={`text-xs ${
                                watchPlaceOfSupply === currentBusiness.state_code
                                  ? "bg-green-500/10 text-green-400 border-green-500/30"
                                  : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                              }`}>
                                {watchPlaceOfSupply === currentBusiness.state_code ? "Intra-State" : "Inter-State"}
                              </Badge>
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {watchPlaceOfSupply === currentBusiness.state_code ? (
                                <>Within {INDIAN_STATES.find(s => s.code === currentBusiness.state_code)?.name}</>
                              ) : (
                                <>{INDIAN_STATES.find(s => s.code === currentBusiness.state_code)?.name} → {INDIAN_STATES.find(s => s.code === watchPlaceOfSupply)?.name}</>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg ${
                          watchPlaceOfSupply === currentBusiness.state_code
                            ? "bg-green-500/10 border border-green-500/20"
                            : "bg-blue-500/10 border border-blue-500/20"
                        }`}>
                          <span className={`text-xs sm:text-sm font-medium ${
                            watchPlaceOfSupply === currentBusiness.state_code ? "text-green-300" : "text-blue-300"
                          }`}>
                            Tax:
                          </span>
                          <Badge className={`text-xs sm:text-sm ${
                            watchPlaceOfSupply === currentBusiness.state_code
                              ? "bg-green-600 hover:bg-green-700 text-white font-semibold"
                              : "bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                          }`}>
                            {watchPlaceOfSupply === currentBusiness.state_code ? "CGST + SGST" : "IGST"}
                          </Badge>
                        </div>
                      </div>
                    </Alert>
                  )}
                </FieldGroup>
              </CardContent>
            </Card>

            {/* Invoice Items - Mobile Optimized */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base md:text-lg">Invoice Items</CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                      {invoiceType === "sales" 
                        ? "Select items from inventory to add to invoice" 
                        : "Select items from inventory or add custom items"}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Select
                      onValueChange={(value) => {
                        if (value === "__custom__") {
                          append({
                            item_name: "",
                            unit: "PCS",
                            quantity: 1,
                            unit_price: 0,
                            discount_pct: 0,
                            gst_rate: 18,
                          })
                        } else {
                          const item = inventoryItems.find((i) => i.id === value)
                          if (item) {
                            append({
                              item_id: item.id,
                              item_name: item.name,
                              unit: item.unit,
                              quantity: 1,
                              unit_price: invoiceType === "sales" ? item.selling_price : item.purchase_price,
                              discount_pct: 0,
                              gst_rate: item.gst_rate,
                              hsn_code: item.hsn_code || "",
                            })
                          }
                        }
                      }}
                      disabled={isLoadingInventory}
                    >
                      <SelectTrigger className="w-full sm:w-[280px]">
                        <SelectValue placeholder="+ Add item from inventory" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Inventory Items
                        </div>
                        {inventoryItems.length === 0 ? (
                          <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                            No inventory items available
                          </div>
                        ) : (
                          inventoryItems.map((item) => {
                            const isOutOfStock = item.current_stock <= 0
                            const isLowStock = item.current_stock <= (item.low_stock_threshold || 0)
                            const canUseForSales = invoiceType === "purchase" || item.current_stock > 0

                            return (
                              <SelectItem
                                key={item.id}
                                value={item.id}
                                disabled={invoiceType === "sales" && isOutOfStock}
                                className={invoiceType === "sales" && isOutOfStock ? "opacity-50" : ""}
                              >
                                <div className="flex items-center justify-between w-full gap-3">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium truncate max-w-45">{item.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      ₹{invoiceType === "sales" ? item.selling_price : item.purchase_price} / {item.unit}
                                    </span>
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className={`text-xs shrink-0 ${
                                      isOutOfStock
                                        ? "text-red-600 border-red-600 bg-red-50 dark:bg-red-950/20"
                                        : isLowStock
                                        ? "text-orange-600 border-orange-600 bg-orange-50 dark:bg-orange-950/20"
                                        : "text-green-600 border-green-600 bg-green-50 dark:bg-green-950/20"
                                    }`}
                                  >
                                    {isOutOfStock ? "Out" : item.current_stock}
                                  </Badge>
                                </div>
                              </SelectItem>
                            )
                          })
                        )}
                        <div className="border-t my-1" />
                        <SelectItem value="__custom__">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Plus className="h-4 w-4" />
                            <span className="text-sm">Add custom item</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 md:space-y-4">
                  {fields.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No items added yet</p>
                      <p className="text-xs mt-1">Use the dropdown above to add items</p>
                    </div>
                  )}
                  {fields.map((field, index) => (
                    <Card key={field.id} className="border-2">
                      <CardContent className="pt-4 md:pt-6">
                        <div className="space-y-3 md:space-y-4">
                          <div className="flex items-center justify-between">
                            <Badge className="text-xs">Item {index + 1}</Badge>
                            <div className="flex items-center gap-2">
                              {invoiceType === "purchase" && !watchItems[index]?.item_id && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAddToMasterInventory(index)}
                                  className="cursor-pointer text-xs"
                                  title="Add this item to master inventory"
                                >
                                  <Database className="h-3 w-3 mr-1" />
                                  Add to Inventory
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => remove(index)}
                                className="cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>

                          <div className="grid gap-3 md:gap-4 sm:grid-cols-2">
                            <Field className="sm:col-span-2">
                              <FieldLabel className="text-xs md:text-sm">Select from Inventory</FieldLabel>
                              <Select
                                onValueChange={(value) => handleItemSelect(index, value)}
                                disabled={isLoadingInventory}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Change item..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                  {inventoryItems.map((item) => {
                                    const isOutOfStock = item.current_stock <= 0
                                    const isLowStock = item.current_stock <= (item.low_stock_threshold || 0)

                                    return (
                                      <SelectItem
                                        key={item.id}
                                        value={item.id}
                                        disabled={invoiceType === "sales" && isOutOfStock}
                                        className={invoiceType === "sales" && isOutOfStock ? "opacity-50" : ""}
                                      >
                                        <div className="flex items-center justify-between w-full gap-4">
                                          <span className="text-xs md:text-sm">{item.name} ({item.unit})</span>
                                          <Badge
                                            variant="outline"
                                            className={`text-xs ${
                                              isOutOfStock
                                                ? "text-red-600 border-red-600 bg-red-50 dark:bg-red-950/20"
                                                : isLowStock
                                                ? "text-orange-600 border-orange-600 bg-orange-50 dark:bg-orange-950/20"
                                                : "text-green-600 border-green-600 bg-green-50 dark:bg-green-950/20"
                                            }`}
                                          >
                                            {isOutOfStock ? "Out" : item.current_stock}
                                          </Badge>
                                        </div>
                                      </SelectItem>
                                    )
                                  })}
                                </SelectContent>
                              </Select>
                            </Field>

                            <Field className="sm:col-span-2">
                              <FieldLabel className="text-xs md:text-sm">Item Name <span className="text-destructive">*</span></FieldLabel>
                              <Input
                                {...register(`items.${index}.item_name`)}
                                disabled={isSubmitting}
                                className="text-sm"
                              />
                              {errors.items?.[index]?.item_name && (
                                <p className="text-xs text-destructive">
                                  {errors.items[index]?.item_name?.message}
                                </p>
                              )}
                            </Field>

                            <Field>
                              <FieldLabel className="text-xs md:text-sm">HSN Code</FieldLabel>
                              <Input
                                {...register(`items.${index}.hsn_code`)}
                                disabled={isSubmitting}
                                className="text-sm"
                              />
                            </Field>

                            <Field>
                              <FieldLabel className="text-xs md:text-sm">Description</FieldLabel>
                              <Input
                                {...register(`items.${index}.description`)}
                                disabled={isSubmitting}
                                className="text-sm"
                              />
                            </Field>

                            <Field>
                              <FieldLabel className="text-xs md:text-sm">Unit <span className="text-destructive">*</span></FieldLabel>
                              <Input
                                {...register(`items.${index}.unit`)}
                                disabled={isSubmitting}
                                className="text-sm"
                              />
                            </Field>

                            <Field>
                              <FieldLabel className="text-xs md:text-sm">Quantity <span className="text-destructive">*</span></FieldLabel>
                              <Input
                                type="number"
                                step="0.001"
                                min="0"
                                {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                                disabled={isSubmitting}
                                onKeyDown={(e) => {
                                  if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                                    e.preventDefault();
                                  }
                                }}
                                className="text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              {watchItems[index]?.item_id && (() => {
                                const selectedItem = inventoryItems.find(i => i.id === watchItems[index].item_id)
                                if (selectedItem) {
                                  const currentQty = watchItems[index]?.quantity || 0
                                  const availableStock = selectedItem.current_stock
                                  const isLowStock = availableStock <= (selectedItem.low_stock_threshold || 0)
                                  const isOverStock = currentQty > availableStock
                                  
                                  return (
                                    <div className="mt-1.5">
                                      <div className={`text-xs px-2 py-1 rounded-md inline-flex items-center gap-1.5 ${
                                        isOverStock 
                                          ? "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
                                          : isLowStock
                                          ? "bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800"
                                          : "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
                                      }`}>
                                        <span className="font-medium">Available:</span>
                                        <span className="font-semibold">{availableStock} {selectedItem.unit}</span>
                                        {isOverStock && <span className="ml-1">⚠️</span>}
                                      </div>
                                    </div>
                                  )
                                }
                                return null
                              })()}
                            </Field>

                            <Field>
                              <FieldLabel className="text-xs md:text-sm">Unit Price <span className="text-destructive">*</span></FieldLabel>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                {...register(`items.${index}.unit_price`, { valueAsNumber: true })}
                                disabled={isSubmitting}
                                onKeyDown={(e) => {
                                  if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                                    e.preventDefault();
                                  }
                                }}
                                className="text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </Field>

                            <Field>
                              <FieldLabel className="text-xs md:text-sm">Discount %</FieldLabel>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                {...register(`items.${index}.discount_pct`, { valueAsNumber: true })}
                                disabled={isSubmitting}
                                onKeyDown={(e) => {
                                  if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                                    e.preventDefault();
                                  }
                                }}
                                className="text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </Field>

                            <Field>
                              <FieldLabel className="text-xs md:text-sm">GST Rate % <span className="text-destructive">*</span></FieldLabel>
                              <Select
                                value={watchItems[index]?.gst_rate?.toString() || "18"}
                                onValueChange={(value) => setValue(`items.${index}.gst_rate`, parseFloat(value))}
                              >
                                <SelectTrigger>
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
                            </Field>

                            <div className="sm:col-span-2">
                              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                                <span className="font-medium text-sm">Item Total:</span>
                                <span className="text-base md:text-lg font-bold">
                                  {formatCurrency(calculateItemTotal(index))}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Invoice Summary - Mobile Optimized */}
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="text-base md:text-lg">Invoice Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 md:space-y-3">
                  <div className="flex justify-between text-sm md:text-base">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
                  </div>
                  {totals.totalDiscount > 0 && (
                    <div className="flex justify-between text-sm md:text-base">
                      <span className="text-muted-foreground">Total Discount</span>
                      <span className="font-medium text-red-600">
                        -{formatCurrency(totals.totalDiscount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm md:text-base">
                    <span className="text-muted-foreground">Taxable Amount</span>
                    <span className="font-medium">{formatCurrency(totals.taxableAmount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm md:text-base">
                    <span className="text-muted-foreground">
                      Total Tax {watch("is_igst") ? "(IGST)" : "(CGST + SGST)"}
                    </span>
                    <span className="font-medium">{formatCurrency(totals.totalTax)}</span>
                  </div>
                  {!watch("is_igst") && totals.totalTax > 0 && (
                    <div className="ml-4 space-y-1 text-xs md:text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>• CGST</span>
                        <span>{formatCurrency(totals.totalTax / 2)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>• SGST</span>
                        <span>{formatCurrency(totals.totalTax / 2)}</span>
                      </div>
                    </div>
                  )}
                  <Separator />
                  <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">Round Off</p>
                      <p className="text-xs text-muted-foreground">Round grand total to nearest rupee</p>
                    </div>
                    <Switch
                      checked={!!watchRoundOffEnabled}
                      onCheckedChange={(checked) => setValue("round_off_enabled", checked, { shouldDirty: true })}
                      disabled={isSubmitting}
                    />
                  </div>
                  {totals.roundOff !== 0 && (
                    <div className="flex justify-between text-sm md:text-base">
                      <span className="text-muted-foreground">Round Off</span>
                      <span className="font-medium">{formatCurrency(totals.roundOff)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-base md:text-lg">
                    <span className="font-bold">Grand Total</span>
                    <span className="font-bold text-primary">
                      {formatCurrency(totals.grandTotal)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes - Mobile Optimized */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base md:text-lg">Additional Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Field>
                  <Textarea
                    {...register("notes")}
                    rows={3}
                    placeholder="Add any additional notes or terms"
                    disabled={isSubmitting}
                    className="text-sm"
                  />
                </Field>
              </CardContent>
            </Card>

            {/* Submit - Mobile Optimized */}
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardContent className="pt-4 md:pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Save className="h-5 w-5 text-primary shrink-0" />
                    <p className="font-semibold text-sm md:text-base">Create Invoice</p>
                  </div>
                  <div className="flex gap-2 md:gap-3 w-full sm:w-auto">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push("/invoices")}
                      disabled={isSubmitting}
                      className="cursor-pointer flex-1 sm:flex-none"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="cursor-pointer flex-1 sm:flex-none">
                      {isSubmitting ? "Creating..." : "Create"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
        </PageLayout>
      </SidebarInset>
    </SidebarProvider>
  )
}
