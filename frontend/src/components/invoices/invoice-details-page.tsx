"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { cancelInvoiceSchema, type CancelInvoiceFormData } from "@/validators/invoice.validator"
import { invoiceService } from "@/services/invoice.service"
import { useBusinessStore } from "@/store/useBusinessStore"
import type { InvoiceWithItems } from "@/types/invoice"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/error-handler"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, 
  ArrowLeft,
  Download,
  XCircle,
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  User,
  MapPin,
  Package,
  Mail,
  Share2,
  Copy,
  Wallet,
  MoreVertical
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
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SendInvoiceEmailDialog } from "@/components/invoices/send-invoice-email-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table"

interface InvoiceDetailsPageProps {
  invoiceId: string
}

export function InvoiceDetailsPage({ invoiceId }: InvoiceDetailsPageProps) {
  const router = useRouter()
  const { currentBusiness } = useBusinessStore()
  const [invoice, setInvoice] = useState<InvoiceWithItems | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [shareLink, setShareLink] = useState("")
  const [isGeneratingLink, setIsGeneratingLink] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<CancelInvoiceFormData>({
    resolver: zodResolver(cancelInvoiceSchema),
  })

  useEffect(() => {
    if (currentBusiness && invoiceId) {
      fetchInvoice()
    }
  }, [currentBusiness, invoiceId])

  const fetchInvoice = async () => {
    if (!currentBusiness) return

    setIsLoading(true)
    try {
      const data = await invoiceService.getInvoice(currentBusiness.id, invoiceId)
      setInvoice(data)
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage)
      router.push("/invoices")
    } finally {
      setIsLoading(false)
    }
  }

  const onCancel = async (data: CancelInvoiceFormData) => {
    if (!currentBusiness || !invoice) return

    try {
      const updatedInvoice = await invoiceService.cancelInvoice(
        currentBusiness.id,
        invoice.id,
        data
      )
      
      setInvoice({ ...invoice, ...updatedInvoice })
      setShowCancelDialog(false)
      toast.success("Invoice cancelled successfully. You can now create a revised invoice.")
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage)
    }
  }

  const handleDownloadPdf = async () => {
    if (!currentBusiness || !invoice) return

    setIsDownloading(true)
    try {
      const blob = await invoiceService.downloadPdf(currentBusiness.id, invoice.id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoice.invoice_number}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("PDF downloaded successfully!")
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleGenerateShareLink = async () => {
    if (!currentBusiness || !invoice) return

    setIsGeneratingLink(true)
    try {
      const { share_url } = await invoiceService.getShareLink(currentBusiness.id, invoice.id)
      setShareLink(share_url)
      toast.success("Share link generated!")
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage)
    } finally {
      setIsGeneratingLink(false)
    }
  }

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(shareLink)
    toast.success("Link copied to clipboard!")
  }

  const getRevisionUrl = () => {
    if (!invoice) return null
    if (invoice.invoice_type !== "sales" && invoice.invoice_type !== "purchase") return null
    return `/invoices/create/${invoice.invoice_type}?source_invoice_id=${invoice.id}&mode=revise`
  }

  const handleDuplicateInvoice = () => {
    const revisionUrl = getRevisionUrl()
    if (!revisionUrl) {
      toast.error("This invoice type cannot be revised from here.")
      return
    }

    setIsDuplicating(true)
    router.push(revisionUrl)
  }

  const handleRecordPayment = () => {
    router.push(`/payments/record?invoice_id=${invoice?.id}`)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount)
  }

  const getDisplayRate = (item: InvoiceWithItems["items"][number]) => {
    if (!item.quantity) return 0
    return (item.taxable_value + item.discount_amount) / item.quantity
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

  const getPaymentStatusBadge = () => {
    if (!invoice) return null
    
    switch (invoice.payment_status) {
      case "paid":
        return (
          <Badge variant="outline" className="text-green-600 border-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Paid
          </Badge>
        )
      case "partial":
        return (
          <Badge variant="outline" className="text-blue-600 border-blue-600">
            <Clock className="h-3 w-3 mr-1" />
            Partial
          </Badge>
        )
      case "unpaid":
        return (
          <Badge variant="outline" className="text-orange-600 border-orange-600">
            <Clock className="h-3 w-3 mr-1" />
            Unpaid
          </Badge>
        )
      case "overdue":
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Overdue
          </Badge>
        )
    }
  }

  const getTotalBeforeRounding = () => {
    if (!invoice) return 0
    return invoice.grand_total - invoice.round_off
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
              <p className="text-muted-foreground">Loading invoice details...</p>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  if (!invoice) {
    return null
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <PageLayout onRefresh={fetchInvoice}>
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
                  <BreadcrumbPage>{invoice.invoice_number}</BreadcrumbPage>
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
                <FileText className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight truncate">
                    {invoice.invoice_number}
                  </h1>
                  <Badge variant={invoice.invoice_type === "sales" ? "default" : "secondary"}>
                    {invoice.invoice_type}
                  </Badge>
                  {getPaymentStatusBadge()}
                  {invoice.is_cancelled && (
                    <Badge variant="outline" className="text-red-600 border-red-600">
                      <XCircle className="h-3 w-3 mr-1" />
                      Cancelled
                    </Badge>
                  )}
                </div>
                <p className="text-sm md:text-base text-muted-foreground mt-1 truncate">
                  {invoice.party_name}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {formatDate(invoice.invoice_date)}
                </p>
              </div>
            </div>
            
            {/* Mobile Action Buttons */}
            <div className="flex flex-col gap-2 md:hidden">
              <Button 
                variant="outline" 
                onClick={() => router.push("/invoices")}
                className="w-full cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Invoices
              </Button>
              
              {!invoice.is_cancelled && invoice.payment_status !== "paid" && (
                <Button 
                  onClick={handleRecordPayment}
                  className="w-full cursor-pointer"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              )}

              <div className="grid grid-cols-2 gap-2">
                {invoice.is_cancelled && (invoice.invoice_type === "sales" || invoice.invoice_type === "purchase") && (
                  <Button
                    onClick={handleDuplicateInvoice}
                    disabled={isDuplicating}
                    className="col-span-2 cursor-pointer"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {isDuplicating ? "Opening..." : "Create Revised Invoice"}
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={handleDownloadPdf}
                  disabled={isDownloading}
                  className="cursor-pointer"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isDownloading ? "..." : "PDF"}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setShowEmailDialog(true)}
                  className="cursor-pointer"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    setShareLink("")
                    setShowShareDialog(true)
                  }}
                  className="cursor-pointer"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="cursor-pointer">
                      <MoreVertical className="h-4 w-4 mr-2" />
                      More
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={handleDuplicateInvoice} disabled={isDuplicating}>
                      <Copy className="h-4 w-4 mr-2" />
                      {isDuplicating
                        ? "Opening..."
                        : invoice.is_cancelled
                        ? "Create Revised Invoice"
                        : "Revise as New Invoice"}
                    </DropdownMenuItem>
                    
                    {!invoice.is_cancelled && invoice.invoice_type !== "credit_note" && invoice.invoice_type !== "debit_note" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => router.push(`/invoices/${invoice.id}/note?type=credit_note`)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Credit Note
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => router.push(`/invoices/${invoice.id}/note?type=debit_note`)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Debit Note
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    {!invoice.is_cancelled && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setShowCancelDialog(true)}
                          className="text-red-600"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancel Invoice
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Desktop Action Buttons */}
            <div className="hidden md:flex gap-2 justify-end">
              <Button variant="outline" onClick={() => router.push("/invoices")} className="cursor-pointer">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              
              {!invoice.is_cancelled && invoice.payment_status !== "paid" && (
                <Button onClick={handleRecordPayment} className="cursor-pointer">
                  <Wallet className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              )}

              {invoice.is_cancelled && (invoice.invoice_type === "sales" || invoice.invoice_type === "purchase") && (
                <Button onClick={handleDuplicateInvoice} disabled={isDuplicating} className="cursor-pointer">
                  <Copy className="h-4 w-4 mr-2" />
                  {isDuplicating ? "Opening..." : "Create Revised Invoice"}
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="cursor-pointer">
                    <MoreVertical className="h-4 w-4 mr-2" />
                    More Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleDownloadPdf} disabled={isDownloading}>
                    <Download className="h-4 w-4 mr-2" />
                    {isDownloading ? "Downloading..." : "Download PDF"}
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => setShowEmailDialog(true)}>
                    <Mail className="h-4 w-4 mr-2" />
                    Email Invoice
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => {
                    setShareLink("")
                    setShowShareDialog(true)
                  }}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Link
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={handleDuplicateInvoice} disabled={isDuplicating}>
                    <Copy className="h-4 w-4 mr-2" />
                    {isDuplicating
                      ? "Opening..."
                      : invoice.is_cancelled
                      ? "Create Revised Invoice"
                      : "Revise as New Invoice"}
                  </DropdownMenuItem>
                  
                  {!invoice.is_cancelled && invoice.invoice_type !== "credit_note" && invoice.invoice_type !== "debit_note" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => router.push(`/invoices/${invoice.id}/note?type=credit_note`)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Create Credit Note
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => router.push(`/invoices/${invoice.id}/note?type=debit_note`)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Create Debit Note
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  {!invoice.is_cancelled && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => setShowCancelDialog(true)}
                        className="text-red-600"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel Invoice
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Email Dialog */}
          <SendInvoiceEmailDialog
            isOpen={showEmailDialog}
            onClose={() => setShowEmailDialog(false)}
            businessId={currentBusiness?.id || ""}
            invoiceId={invoice.id}
            invoiceNumber={invoice.invoice_number}
          />

          {/* Share Dialog */}
          <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Share Invoice</DialogTitle>
                <DialogDescription>
                  Generate a shareable link for invoice {invoice.invoice_number}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {!shareLink ? (
                  <Button 
                    onClick={handleGenerateShareLink} 
                    disabled={isGeneratingLink}
                    className="w-full"
                  >
                    {isGeneratingLink ? "Generating..." : "Generate Share Link"}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Input value={shareLink} readOnly className="flex-1" />
                      <Button variant="outline" size="icon" onClick={handleCopyShareLink}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This link will expire in 7 days
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowShareDialog(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Cancel Dialog */}
          <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel Invoice</AlertDialogTitle>
                <AlertDialogDescription>
                  This will mark the invoice as cancelled. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <form onSubmit={handleSubmit(onCancel)} className="space-y-4">
                <Field>
                  <FieldLabel>Cancellation Reason</FieldLabel>
                  <Textarea
                    {...register("cancel_reason")}
                    rows={3}
                    placeholder="Enter reason for cancellation"
                  />
                </Field>

                <AlertDialogFooter>
                  <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
                  <Button type="submit" variant="destructive" disabled={isSubmitting}>
                    {isSubmitting ? "Cancelling..." : "Cancel Invoice"}
                  </Button>
                </AlertDialogFooter>
              </form>
            </AlertDialogContent>
          </AlertDialog>

          {/* Invoice Summary Cards - Mobile Optimized */}
          <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Grand Total</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-xl md:text-2xl font-bold">
                  {formatCurrency(invoice.grand_total)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Paid</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">
                  {formatCurrency(invoice.amount_paid)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Balance</CardTitle>
                <Clock className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-orange-600">
                  {formatCurrency(invoice.balance_due)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Tax</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-xl md:text-2xl font-bold">
                  {formatCurrency(invoice.total_tax)}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
            {/* Invoice Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base md:text-lg">Invoice Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs md:text-sm text-muted-foreground">Party</p>
                    <p className="font-medium text-sm md:text-base truncate">{invoice.party_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">Invoice Date</p>
                    <p className="font-medium text-sm md:text-base">{formatDate(invoice.invoice_date)}</p>
                  </div>
                </div>

                {invoice.due_date && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground">Due Date</p>
                      <p className="font-medium text-sm md:text-base">{formatDate(invoice.due_date)}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs md:text-sm text-muted-foreground">Place of Supply</p>
                    <p className="font-medium text-sm md:text-base truncate">
                      {invoice.place_of_supply} {invoice.is_igst ? "(IGST)" : "(CGST + SGST)"}
                    </p>
                  </div>
                </div>

                {invoice.notes && (
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">Notes</p>
                    <p className="text-xs md:text-sm mt-1 break-words">{invoice.notes}</p>
                  </div>
                )}

                <div className="pt-3 md:pt-4 border-t">
                  <p className="text-xs md:text-sm text-muted-foreground">Created By</p>
                  <p className="text-xs md:text-sm">{invoice.created_by_name || "System"}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(invoice.created_at)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Tax Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base md:text-lg">Tax Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 md:space-y-3">
                <div className="flex justify-between text-sm md:text-base">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
                </div>
                {invoice.total_discount > 0 && (
                  <div className="flex justify-between text-sm md:text-base">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-medium text-red-600">
                      -{formatCurrency(invoice.total_discount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm md:text-base">
                  <span className="text-muted-foreground">Taxable Amount</span>
                  <span className="font-medium">{formatCurrency(invoice.taxable_amount)}</span>
                </div>
                <Separator />
                {invoice.is_igst ? (
                  <div className="flex justify-between text-sm md:text-base">
                    <span className="text-muted-foreground">IGST</span>
                    <span className="font-medium">{formatCurrency(invoice.igst_amount)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-sm md:text-base">
                      <span className="text-muted-foreground">CGST</span>
                      <span className="font-medium">{formatCurrency(invoice.cgst_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm md:text-base">
                      <span className="text-muted-foreground">SGST</span>
                      <span className="font-medium">{formatCurrency(invoice.sgst_amount)}</span>
                    </div>
                  </>
                )}
                <Separator />
                <div className="flex justify-between text-sm md:text-base">
                  <span className="text-muted-foreground">Total Tax</span>
                  <span className="font-medium">{formatCurrency(invoice.total_tax)}</span>
                </div>
                <div className="flex justify-between text-sm md:text-base">
                  <span className="text-muted-foreground">Total Before Rounding</span>
                  <span className="font-medium">{formatCurrency(getTotalBeforeRounding())}</span>
                </div>
                <div className="flex justify-between text-sm md:text-base">
                  <span className="text-muted-foreground">Round Off</span>
                  <span className="font-medium">{formatCurrency(invoice.round_off)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-base md:text-lg">
                  <span className="font-semibold">Final Total</span>
                  <span className="font-bold">{formatCurrency(invoice.grand_total)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invoice Items - Mobile Optimized */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Invoice Items</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                List of all items in this invoice
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Desktop Table View */}
              <div className="hidden md:block rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Discount</TableHead>
                      <TableHead className="text-right">Taxable</TableHead>
                      <TableHead className="text-right">GST</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.item_name}</p>
                            {item.hsn_code && (
                              <p className="text-xs text-muted-foreground">HSN: {item.hsn_code}</p>
                            )}
                            {item.description && (
                              <p className="text-xs text-muted-foreground">{item.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantity} {item.unit}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(getDisplayRate(item))}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.discount_amount > 0 ? formatCurrency(item.discount_amount) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.taxable_value)}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.gst_rate}%
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.total_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={6} className="text-right font-bold">
                        Final Total
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(invoice.grand_total)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {invoice.items.map((item, index) => (
                  <Card key={item.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.item_name}</p>
                          {item.hsn_code && (
                            <p className="text-xs text-muted-foreground">HSN: {item.hsn_code}</p>
                          )}
                          {item.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="flex-shrink-0">#{index + 1}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Qty:</span>
                          <span className="ml-1 font-medium">{item.quantity} {item.unit}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-muted-foreground">Price:</span>
                          <span className="ml-1 font-medium">{formatCurrency(getDisplayRate(item))}</span>
                        </div>
                        {item.discount_amount > 0 && (
                          <div>
                            <span className="text-muted-foreground">Discount:</span>
                            <span className="ml-1 font-medium text-red-600">{formatCurrency(item.discount_amount)}</span>
                          </div>
                        )}
                        <div className={item.discount_amount > 0 ? "text-right" : ""}>
                          <span className="text-muted-foreground">GST:</span>
                          <span className="ml-1 font-medium">{item.gst_rate}%</span>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-sm font-semibold">Total</span>
                        <span className="text-sm font-bold">{formatCurrency(item.total_amount)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                <Card className="bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <span className="font-bold">Final Total</span>
                      <span className="text-lg font-bold">{formatCurrency(invoice.grand_total)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
        </PageLayout>
      </SidebarInset>
    </SidebarProvider>
  )
}
