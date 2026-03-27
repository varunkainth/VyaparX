"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { paymentService } from "@/services/payment.service"
import { partyService } from "@/services/party.service"
import { invoiceService } from "@/services/invoice.service"
import { useBusinessStore } from "@/store/useBusinessStore"
import type { Party } from "@/types/party"
import type { InvoiceWithItems, Invoice } from "@/types/invoice"
import { PAYMENT_MODES } from "@/types/payment"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/error-handler"

// Helper for dev-only logging
const devLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV === "development") {
    console.log(...args)
  }
}

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { 
  Wallet, 
  ArrowLeft,
  Save,
  TrendingUp,
  TrendingDown,
  FileText
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Simplified schema without invoice allocations
const recordPaymentSchema = z.object({
  party_id: z.string().uuid("Please select a party"),
  payment_type: z.enum(["received", "made"]),
  amount: z.number().positive("Amount must be greater than 0"),
  payment_date: z.string().min(1, "Payment date is required"),
  payment_mode: z.enum(["cash", "bank_transfer", "upi", "card", "cheque", "other"]),
  upi_ref: z.string().max(100).optional(),
  bank_ref_no: z.string().max(100).optional(),
  cheque_no: z.string().max(50).optional(),
  cheque_date: z.string().optional(),
  notes: z.string().optional(),
});

type RecordPaymentFormData = z.infer<typeof recordPaymentSchema>;

export function RecordPaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const invoiceId = searchParams.get("invoice_id")
  
  const { currentBusiness } = useBusinessStore()
  const [parties, setParties] = useState<Party[]>([])
  const [isLoadingParties, setIsLoadingParties] = useState(true)
  const [invoice, setInvoice] = useState<InvoiceWithItems | null>(null)
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false)
  const [availableInvoices, setAvailableInvoices] = useState<Invoice[]>([])
  const [isLoadingAvailableInvoices, setIsLoadingAvailableInvoices] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("")

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<RecordPaymentFormData>({
    resolver: zodResolver(recordPaymentSchema),
    defaultValues: {
      payment_date: new Date().toISOString().split('T')[0],
      payment_type: "received",
      payment_mode: "cash",
    },
  })

  const paymentType = watch("payment_type")
  const paymentMode = watch("payment_mode")
  const watchPartyId = watch("party_id")

  useEffect(() => {
    if (currentBusiness) {
      // Load parties first, then invoice to ensure party dropdown is populated
      const loadData = async () => {
        await fetchParties()
        if (invoiceId) {
          await fetchInvoice()
        }
      }
      loadData()
    }
  }, [currentBusiness, invoiceId])

  // Ensure party_id is set after both invoice and parties are loaded
  useEffect(() => {
    if (invoice && parties.length > 0 && !watch("party_id")) {
      setValue("party_id", invoice.party_id)
    }
  }, [invoice, parties])

  // Fetch available invoices when party is selected
  useEffect(() => {
    devLog("Party/PaymentType changed:", { watchPartyId, paymentType, hasInvoiceId: !!invoiceId })
    if (watchPartyId && !invoiceId) {
      fetchAvailableInvoices(watchPartyId)
    } else if (!watchPartyId) {
      // Clear invoices if no party selected
      setAvailableInvoices([])
      setSelectedInvoiceId("")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchPartyId, paymentType])

  const fetchAvailableInvoices = async (partyId: string) => {
    if (!currentBusiness) return

    setIsLoadingAvailableInvoices(true)
    try {
      const invoiceType = paymentType === "received" ? "sales" : "purchase"
      devLog("Fetching invoices for:", { partyId, invoiceType, paymentType })
      
      const data = await invoiceService.listInvoices(currentBusiness.id, {
        party_id: partyId,
        invoice_type: invoiceType,
        limit: 100,
      })
      
      devLog("All invoices:", data.items)
      
      // Filter for unpaid and partial invoices
      const unpaidInvoices = data.items.filter(
        inv => inv.payment_status === "unpaid" || inv.payment_status === "partial"
      )
      
      devLog("Unpaid/Partial invoices:", unpaidInvoices)
      setAvailableInvoices(unpaidInvoices)
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      console.error("Error fetching invoices:", error)
      toast.error(`Failed to load invoices: ${errorMessage}`)
    } finally {
      setIsLoadingAvailableInvoices(false)
    }
  }

  const handleInvoiceSelect = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId)
    const selectedInvoice = availableInvoices.find(inv => inv.id === invoiceId)
    if (selectedInvoice) {
      setValue("amount", selectedInvoice.balance_due)
      setValue("notes", `Payment for invoice ${selectedInvoice.invoice_number}`)
    }
  }

  const fetchParties = async () => {
    if (!currentBusiness) return

    setIsLoadingParties(true)
    try {
      const data = await partyService.listParties(currentBusiness.id, {
        include_inactive: false,
      })
      setParties(data)
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage)
    } finally {
      setIsLoadingParties(false)
    }
  }

  const fetchInvoice = async () => {
    if (!currentBusiness || !invoiceId) return

    setIsLoadingInvoice(true)
    try {
      const data = await invoiceService.getInvoice(currentBusiness.id, invoiceId)
      setInvoice(data)
      
      // Pre-fill form with invoice data
      setValue("party_id", data.party_id)
      setValue("amount", data.balance_due)
      setValue("payment_type", data.invoice_type === "sales" ? "received" : "made")
      setValue("notes", `Payment for invoice ${data.invoice_number}`)
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(`Failed to load invoice: ${errorMessage}`)
    } finally {
      setIsLoadingInvoice(false)
    }
  }

  const onSubmit = async (data: RecordPaymentFormData) => {
    if (!currentBusiness) return

    // If we're recording payment for a specific invoice, ensure it's loaded
    if (invoiceId && !invoice) {
      toast.error("Invoice details are still loading. Please wait.")
      return
    }

    // Determine which invoice to use
    const targetInvoiceId = invoice?.id || selectedInvoiceId

    // Require invoice selection - don't allow unallocated payments for now
    if (!targetInvoiceId) {
      toast.error("Please select an invoice to allocate this payment. Create a new invoice first if needed.")
      return
    }

    try {
      const paymentData = {
        ...data,
        allocations: [
          {
            invoice_id: targetInvoiceId,
            allocated_amount: data.amount,
          },
        ],
      };

      await paymentService.recordPayment(paymentData)
      toast.success("Payment recorded successfully!")
      
      // Redirect back to invoice if we came from one, otherwise go to payments list
      if (invoice?.id) {
        router.push(`/invoices/${invoice.id}`)
      } else {
        router.push("/payments")
      }
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
                  <BreadcrumbLink href="/payments">Payments</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Record Payment</BreadcrumbPage>
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
                <Wallet className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Record Payment</h1>
                <p className="text-muted-foreground mt-1">
                  Record a new payment transaction
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => router.push("/payments")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>

          {!invoice && !invoiceId && (
            <Alert>
              <AlertDescription>
                Select a party and invoice to record payment. The payment will be allocated to the selected invoice.
              </AlertDescription>
            </Alert>
          )}

          {invoice && (
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Recording Payment for Invoice</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Payment details are pre-filled from the invoice
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 p-4 rounded-lg bg-background/60 backdrop-blur-sm border">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Invoice Number</span>
                    <span className="font-semibold text-sm">{invoice.invoice_number}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Invoice Date</span>
                    <span className="font-medium text-sm">
                      {new Date(invoice.invoice_date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Grand Total</span>
                    <span className="font-semibold text-sm">₹{invoice.grand_total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Amount Paid</span>
                    <span className="font-semibold text-sm text-green-600">₹{invoice.amount_paid.toFixed(2)}</span>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex justify-between items-center p-3 rounded-md bg-primary/10 border border-primary/20">
                    <span className="font-semibold text-sm">Balance Due</span>
                    <span className="font-bold text-xl text-primary">₹{invoice.balance_due.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Payment Type & Party */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Payment Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Field>
                      <FieldLabel required>Payment Type</FieldLabel>
                      <Select
                        value={paymentType}
                        onValueChange={(value) => setValue("payment_type", value as "received" | "made")}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="received">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-green-600" />
                              Payment Received (from Customer)
                            </div>
                          </SelectItem>
                          <SelectItem value="made">
                            <div className="flex items-center gap-2">
                              <TrendingDown className="h-4 w-4 text-red-600" />
                              Payment Made (to Supplier)
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.payment_type && (
                        <p className="text-sm text-destructive">{errors.payment_type.message}</p>
                      )}
                    </Field>

                    <Field>
                      <FieldLabel required>Party</FieldLabel>
                      <Select
                        value={watch("party_id") || ""}
                        onValueChange={(value) => setValue("party_id", value)}
                        disabled={isLoadingParties || !!invoice}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select party" />
                        </SelectTrigger>
                        <SelectContent>
                          {parties.map((party) => (
                            <SelectItem key={party.id} value={party.id}>
                              {party.name} ({party.party_type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.party_id && (
                        <p className="text-sm text-destructive">{errors.party_id.message}</p>
                      )}
                      {invoice && (
                        <p className="text-xs text-muted-foreground">
                          Party is pre-filled from the invoice
                        </p>
                      )}
                    </Field>

                    {!invoice && watchPartyId && !isLoadingAvailableInvoices && availableInvoices.length === 0 && (
                      <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
                        <AlertDescription className="text-sm">
                          <span className="font-semibold">No unpaid invoices found</span> - All invoices for this party are fully paid. Please create a new invoice first before recording payment.
                        </AlertDescription>
                      </Alert>
                    )}

                    {!invoice && watchPartyId && (
                      <Field>
                        <FieldLabel>Select Invoice {availableInvoices.length > 0 && `(${availableInvoices.length} available)`}</FieldLabel>
                        <Select
                          value={selectedInvoiceId}
                          onValueChange={handleInvoiceSelect}
                          disabled={isLoadingAvailableInvoices || availableInvoices.length === 0}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={
                              isLoadingAvailableInvoices 
                                ? "Loading invoices..." 
                                : availableInvoices.length === 0
                                ? "No unpaid invoices available"
                                : "Select invoice"
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {availableInvoices.length === 0 ? (
                              <div className="p-4 text-sm text-center">
                                <p className="text-muted-foreground mb-2">No unpaid invoices found</p>
                                <p className="text-xs text-muted-foreground">
                                  All invoices for this party are fully paid
                                </p>
                              </div>
                            ) : (
                              availableInvoices.map((inv) => (
                                <SelectItem key={inv.id} value={inv.id}>
                                  <div className="flex items-center justify-between w-full gap-4">
                                    <span>{inv.invoice_number}</span>
                                    <span className="text-xs text-muted-foreground">
                                      Due: ₹{inv.balance_due.toFixed(2)}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        {selectedInvoiceId && (() => {
                          const selectedInv = availableInvoices.find(i => i.id === selectedInvoiceId)
                          return selectedInv ? (
                            <div className="mt-2 p-3 rounded-lg bg-muted/50 border text-sm space-y-1">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Invoice Total:</span>
                                <span className="font-medium">₹{selectedInv.grand_total.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Already Paid:</span>
                                <span className="font-medium text-green-600">₹{selectedInv.amount_paid.toFixed(2)}</span>
                              </div>
                              <Separator className="my-1" />
                              <div className="flex justify-between">
                                <span className="font-semibold">Balance Due:</span>
                                <span className="font-bold text-primary">₹{selectedInv.balance_due.toFixed(2)}</span>
                              </div>
                            </div>
                          ) : null
                        })()}
                      </Field>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                      <Field>
                        <FieldLabel required>Amount</FieldLabel>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...register("amount", { valueAsNumber: true })}
                          disabled={isSubmitting}
                          onKeyDown={(e) => {
                            if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                              e.preventDefault();
                            }
                          }}
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        {errors.amount && (
                          <p className="text-sm text-destructive">{errors.amount.message}</p>
                        )}
                      </Field>

                      <Field>
                        <FieldLabel required>Payment Date</FieldLabel>
                        <Input
                          type="date"
                          {...register("payment_date")}
                          disabled={isSubmitting}
                        />
                        {errors.payment_date && (
                          <p className="text-sm text-destructive">{errors.payment_date.message}</p>
                        )}
                      </Field>
                    </div>
                  </FieldGroup>
                </CardContent>
              </Card>

              {/* Payment Mode */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Mode</CardTitle>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Field>
                      <FieldLabel required>Mode</FieldLabel>
                      <Select
                        value={paymentMode}
                        onValueChange={(value) => setValue("payment_mode", value as RecordPaymentFormData["payment_mode"])}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_MODES.map((mode) => (
                            <SelectItem key={mode.value} value={mode.value}>
                              {mode.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.payment_mode && (
                        <p className="text-sm text-destructive">{errors.payment_mode.message}</p>
                      )}
                    </Field>

                    {paymentMode === "upi" && (
                      <Field>
                        <FieldLabel required>UPI Transaction Reference</FieldLabel>
                        <Input
                          {...register("upi_ref")}
                          placeholder="Enter UPI transaction ID (e.g., 123456789012)"
                          disabled={isSubmitting}
                        />
                        {errors.upi_ref && (
                          <p className="text-sm text-destructive">{errors.upi_ref.message}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Required for UPI payments
                        </p>
                      </Field>
                    )}

                    {paymentMode === "cheque" && (
                      <>
                        <Field>
                          <FieldLabel required>Cheque Number</FieldLabel>
                          <Input
                            {...register("cheque_no")}
                            placeholder="Enter cheque number"
                            disabled={isSubmitting}
                          />
                          {errors.cheque_no && (
                            <p className="text-sm text-destructive">{errors.cheque_no.message}</p>
                          )}
                        </Field>
                        <Field>
                          <FieldLabel>Cheque Date</FieldLabel>
                          <Input
                            type="date"
                            {...register("cheque_date")}
                            disabled={isSubmitting}
                          />
                        </Field>
                      </>
                    )}

                    {paymentMode === "bank_transfer" && (
                      <Field>
                        <FieldLabel>Bank Reference (Optional)</FieldLabel>
                        <Input
                          {...register("bank_ref_no")}
                          placeholder="Enter bank transaction reference"
                          disabled={isSubmitting}
                        />
                        <p className="text-xs text-muted-foreground">
                          Optional reference number for the transfer
                        </p>
                      </Field>
                    )}

                    <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
                      <AlertDescription className="text-xs">
                        <span className="font-semibold">Auto-reconciled:</span> Payments are marked reconciled when recorded. Add UPI, cheque, or bank references when available for cleaner audit history.
                      </AlertDescription>
                    </Alert>
                  </FieldGroup>
                </CardContent>
              </Card>

              {/* Additional Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Additional Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <Field>
                    <FieldLabel>Notes</FieldLabel>
                    <Textarea
                      {...register("notes")}
                      rows={5}
                      placeholder="Add any additional notes about this payment"
                      disabled={isSubmitting}
                    />
                  </Field>
                </CardContent>
              </Card>
            </div>

            {/* Submit */}
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Save className="h-5 w-5 text-primary" />
                    <p className="font-semibold">Record Payment</p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push("/payments")}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Recording..." : "Record Payment"}
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
