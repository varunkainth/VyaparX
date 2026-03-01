"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { reconcilePaymentSchema, type ReconcilePaymentFormData } from "@/validators/payment.validator"
import { paymentService } from "@/services/payment.service"
import { useBusinessStore } from "@/store/useBusinessStore"
import type { PaymentWithAllocations } from "@/types/payment"
import { PAYMENT_MODES } from "@/types/payment"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/error-handler"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Badge } from "@/components/ui/badge"
import { 
  Wallet, 
  ArrowLeft,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  FileText,
  Calendar,
  CreditCard,
  User,
  Building
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageLayout } from "@/components/layout/page-layout"
import { MobileTable, MobileTableRow, MobileTableCell } from "@/components/ui/mobile-table"

interface PaymentDetailsPageProps {
  paymentId: string
}

export function PaymentDetailsPage({ paymentId }: PaymentDetailsPageProps) {
  const router = useRouter()
  const { currentBusiness } = useBusinessStore()
  const [payment, setPayment] = useState<PaymentWithAllocations | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showReconcileDialog, setShowReconcileDialog] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ReconcilePaymentFormData>({
    resolver: zodResolver(reconcilePaymentSchema),
  })

  useEffect(() => {
    if (currentBusiness && paymentId) {
      fetchPayment()
    }
  }, [currentBusiness, paymentId])

  const fetchPayment = async () => {
    if (!currentBusiness) return

    setIsLoading(true)
    try {
      const data = await paymentService.getPayment(currentBusiness.id, paymentId)
      setPayment(data)
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage)
      router.push("/payments")
    } finally {
      setIsLoading(false)
    }
  }

  const onReconcile = async (data: ReconcilePaymentFormData) => {
    if (!currentBusiness || !payment) return

    try {
      const updatedPayment = await paymentService.reconcilePayment(
        currentBusiness.id,
        payment.id,
        data
      )
      
      setPayment({ ...payment, ...updatedPayment })
      setShowReconcileDialog(false)
      toast.success("Payment reconciled successfully!")
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage)
    }
  }

  const handleUnreconcile = async () => {
    if (!currentBusiness || !payment) return

    try {
      const updatedPayment = await paymentService.unreconcilePayment(
        currentBusiness.id,
        payment.id
      )
      
      setPayment({ ...payment, ...updatedPayment })
      toast.success("Payment unreconciled successfully!")
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
    }).format(new Date(dateString))
  }

  const formatDateTime = (dateString: string) => {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(dateString))
  }

  const getPaymentModeLabel = (mode: string) => {
    return PAYMENT_MODES.find((m) => m.value === mode)?.label || mode
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
              <p className="text-muted-foreground">Loading payment details...</p>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  if (!payment) {
    return null
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <PageLayout onRefresh={fetchPayment}>
          {/* Header */}
          <header className="flex h-16 shrink-0 items-center gap-2 border-b sticky top-0 bg-background z-10">
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
                    <BreadcrumbPage>Payment Details</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          {/* Main Content */}
          <div className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6 pb-20 md:pb-6">
          {/* Page Header */}
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3 md:gap-4">
              <div className={`p-2 md:p-3 rounded-xl border-2 ${
                payment.payment_type === "received"
                  ? "bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                  : "bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800"
              }`}>
                {payment.payment_type === "received" ? (
                  <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-green-600" />
                ) : (
                  <TrendingDown className="h-6 w-6 md:h-8 md:w-8 text-red-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
                    {formatCurrency(payment.amount)}
                  </h1>
                  <Badge variant={payment.payment_type === "received" ? "default" : "secondary"} className="text-xs">
                    {payment.payment_type === "received" ? "Received" : "Made"}
                  </Badge>
                  {payment.is_reconciled ? (
                    <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {payment.payment_mode === "cash" ? "Verified" : "Reconciled"}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-orange-600 border-orange-600 text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      <span className="hidden sm:inline">{payment.payment_mode === "cash" ? "Pending Verification" : "Pending Reconciliation"}</span>
                      <span className="sm:hidden">Pending</span>
                    </Badge>
                  )}
                </div>
                <p className="text-xs md:text-sm text-muted-foreground mt-1 truncate">
                  {payment.party_name} • {formatDate(payment.payment_date)}
                </p>
              </div>
            </div>
            
            {/* Mobile Action Buttons */}
            <div className="flex gap-2 md:hidden">
              <Button variant="outline" size="sm" onClick={() => router.push("/payments")} className="flex-1 cursor-pointer active:scale-95">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              {!payment.is_reconciled && payment.payment_mode !== "cash" ? (
                <AlertDialog open={showReconcileDialog} onOpenChange={setShowReconcileDialog}>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" className="flex-1 cursor-pointer active:scale-95">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Reconcile
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-[95vw] sm:max-w-lg">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-base md:text-lg">Reconcile Payment</AlertDialogTitle>
                      <AlertDialogDescription className="text-xs md:text-sm">
                        Mark this payment as reconciled with bank statement
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <form onSubmit={handleSubmit(onReconcile)} className="space-y-3 md:space-y-4">
                      <Field>
                        <FieldLabel className="text-xs md:text-sm">Bank Statement Date</FieldLabel>
                        <Input
                          type="date"
                          {...register("bank_statement_date")}
                          className="text-sm"
                        />
                        {errors.bank_statement_date && (
                          <p className="text-xs text-destructive">
                            {errors.bank_statement_date.message}
                          </p>
                        )}
                      </Field>

                      <Field>
                        <FieldLabel className="text-xs md:text-sm">Bank Reference Number</FieldLabel>
                        <Input
                          {...register("bank_ref_no")}
                          placeholder="Enter bank reference"
                          className="text-sm"
                        />
                      </Field>

                      <Field>
                        <FieldLabel className="text-xs md:text-sm">Notes</FieldLabel>
                        <Textarea
                          {...register("notes")}
                          rows={2}
                          placeholder="Add reconciliation notes"
                          className="text-sm"
                        />
                      </Field>

                      <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                        <AlertDialogCancel type="button" className="w-full sm:w-auto cursor-pointer">Cancel</AlertDialogCancel>
                        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto cursor-pointer">
                          {isSubmitting ? "Reconciling..." : "Reconcile Payment"}
                        </Button>
                      </AlertDialogFooter>
                    </form>
                  </AlertDialogContent>
                </AlertDialog>
              ) : payment.is_reconciled && payment.payment_mode !== "cash" ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 cursor-pointer active:scale-95">
                      <Clock className="h-4 w-4 mr-2" />
                      Unreconcile
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-[95vw] sm:max-w-lg">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-base md:text-lg">Unreconcile Payment?</AlertDialogTitle>
                      <AlertDialogDescription className="text-xs md:text-sm">
                        This will mark the payment as unreconciled. Are you sure?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                      <AlertDialogCancel className="w-full sm:w-auto cursor-pointer">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleUnreconcile} className="w-full sm:w-auto cursor-pointer">
                        Unreconcile
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}
            </div>

            {/* Desktop Action Buttons */}
            <div className="hidden md:flex gap-2 justify-end">
              <Button variant="outline" onClick={() => router.push("/payments")} className="cursor-pointer">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              {!payment.is_reconciled && payment.payment_mode !== "cash" ? (
                <AlertDialog open={showReconcileDialog} onOpenChange={setShowReconcileDialog}>
                  <AlertDialogTrigger asChild>
                    <Button className="cursor-pointer">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Reconcile
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reconcile Payment</AlertDialogTitle>
                      <AlertDialogDescription>
                        Mark this payment as reconciled with bank statement
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <form onSubmit={handleSubmit(onReconcile)} className="space-y-4">
                      <Field>
                        <FieldLabel>Bank Statement Date</FieldLabel>
                        <Input
                          type="date"
                          {...register("bank_statement_date")}
                        />
                        {errors.bank_statement_date && (
                          <p className="text-sm text-destructive">
                            {errors.bank_statement_date.message}
                          </p>
                        )}
                      </Field>

                      <Field>
                        <FieldLabel>Bank Reference Number</FieldLabel>
                        <Input
                          {...register("bank_ref_no")}
                          placeholder="Enter bank reference"
                        />
                      </Field>

                      <Field>
                        <FieldLabel>Notes</FieldLabel>
                        <Textarea
                          {...register("notes")}
                          rows={2}
                          placeholder="Add reconciliation notes"
                        />
                      </Field>

                      <AlertDialogFooter>
                        <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? "Reconciling..." : "Reconcile Payment"}
                        </Button>
                      </AlertDialogFooter>
                    </form>
                  </AlertDialogContent>
                </AlertDialog>
              ) : payment.is_reconciled && payment.payment_mode !== "cash" ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="cursor-pointer">
                      <Clock className="h-4 w-4 mr-2" />
                      Unreconcile
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Unreconcile Payment?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will mark the payment as unreconciled. Are you sure?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleUnreconcile}>
                        Unreconcile
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
            {/* Payment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base md:text-lg">Payment Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm text-muted-foreground">Party</p>
                    <p className="font-medium text-sm md:text-base truncate">{payment.party_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">Payment Date</p>
                    <p className="font-medium text-sm md:text-base">{formatDate(payment.payment_date)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">Payment Mode</p>
                    <p className="font-medium text-sm md:text-base">{getPaymentModeLabel(payment.payment_mode)}</p>
                  </div>
                </div>

                {payment.upi_ref && (
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs md:text-sm text-muted-foreground">UPI Reference</p>
                      <p className="font-medium text-sm md:text-base break-all">{payment.upi_ref}</p>
                    </div>
                  </div>
                )}

                {payment.cheque_no && (
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground">Cheque Number</p>
                      <p className="font-medium text-sm md:text-base">{payment.cheque_no}</p>
                      {payment.cheque_date && (
                        <p className="text-xs md:text-sm text-muted-foreground">
                          Date: {formatDate(payment.cheque_date)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {payment.notes && (
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">Notes</p>
                    <p className="text-xs md:text-sm mt-1">{payment.notes}</p>
                  </div>
                )}

                <div className="pt-3 md:pt-4 border-t">
                  <p className="text-xs md:text-sm text-muted-foreground">Created By</p>
                  <p className="text-xs md:text-sm">{payment.created_by_name || "System"}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(payment.created_at)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Reconciliation Details */}
            {payment.is_reconciled && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Reconciliation Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground">Status</p>
                      <p className="font-medium text-sm md:text-base text-green-600">Reconciled</p>
                    </div>
                  </div>

                  {payment.bank_statement_date && (
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-xs md:text-sm text-muted-foreground">Bank Statement Date</p>
                        <p className="font-medium text-sm md:text-base">{formatDate(payment.bank_statement_date)}</p>
                      </div>
                    </div>
                  )}

                  {payment.bank_ref_no && (
                    <div className="flex items-center gap-3">
                      <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs md:text-sm text-muted-foreground">Bank Reference</p>
                        <p className="font-medium text-sm md:text-base break-all">{payment.bank_ref_no}</p>
                      </div>
                    </div>
                  )}

                  <div className="pt-3 md:pt-4 border-t">
                    <p className="text-xs md:text-sm text-muted-foreground">Reconciled By</p>
                    <p className="text-xs md:text-sm">{payment.reconciled_by_name || "System"}</p>
                    {payment.reconciled_at && (
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(payment.reconciled_at)}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Invoice Allocations */}
          {payment.allocations && payment.allocations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base md:text-lg">Invoice Allocations</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  This payment was allocated to the following invoices
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Desktop Table */}
                <div className="hidden md:block rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice Number</TableHead>
                        <TableHead className="text-right">Allocated Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payment.allocations.map((allocation) => (
                        <TableRow key={allocation.id}>
                          <TableCell className="font-medium">
                            {allocation.invoice_number}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(allocation.allocated_amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell className="font-bold">Total</TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <MobileTable className="md:hidden">
                  {payment.allocations.map((allocation) => (
                    <MobileTableRow key={allocation.id}>
                      <MobileTableCell label="Invoice">
                        {allocation.invoice_number}
                      </MobileTableCell>
                      <MobileTableCell label="Amount">
                        {formatCurrency(allocation.allocated_amount)}
                      </MobileTableCell>
                    </MobileTableRow>
                  ))}
                  <MobileTableRow>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm font-bold">Total</span>
                      <span className="text-sm font-bold">{formatCurrency(payment.amount)}</span>
                    </div>
                  </MobileTableRow>
                </MobileTable>
              </CardContent>
            </Card>
          )}
        </div>
      </PageLayout>
      </SidebarInset>
    </SidebarProvider>
  )
}
