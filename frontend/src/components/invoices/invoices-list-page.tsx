"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useBusinessStore } from "@/store/useBusinessStore"
import { invoiceService } from "@/services/invoice.service"
import type { Invoice, InvoiceType, PaymentStatus } from "@/types/invoice"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/error-handler"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FloatingActionButton } from "@/components/ui/floating-action-button"
import { MobileTable, MobileTableRow, MobileTableCell } from "@/components/ui/mobile-table"
import { SwipeableItem } from "@/components/ui/swipeable-item"
import { 
  FileText, 
  Plus, 
  Search, 
  Clock,
  CheckCircle,
  AlertCircle,
  Filter,
  TrendingUp,
  TrendingDown,
  Download,
  Eye,
  MoreVertical,
  Copy,
  XCircle
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
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useKeyboardShortcuts, type KeyboardShortcut } from "@/hooks/useKeyboardShortcuts"
import { KeyboardShortcutsDialog } from "@/components/ui/keyboard-shortcuts-dialog"
import { useRef } from "react"
import { EmptyState } from "@/components/ui/empty-state"
import { ListSkeleton } from "@/components/ui/skeleton-loader"
import { DateRangePicker, type DateRange } from "@/components/ui/date-range-picker"

export function InvoicesListPage() {
  const router = useRouter()
  const { currentBusiness } = useBusinessStore()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState<InvoiceType | "all">("all")
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatus | "all">("all")
  const [lifecycleFilter, setLifecycleFilter] = useState<"all" | "finalized" | "revised" | "cancelled">("all")
  const [includeCancelled, setIncludeCancelled] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set())
  const [isDownloadingBulk, setIsDownloadingBulk] = useState(false)
  const [showCreateDropdown, setShowCreateDropdown] = useState(false)
  const [invoiceToCancel, setInvoiceToCancel] = useState<Invoice | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  const [isCancelling, setIsCancelling] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (currentBusiness) {
      fetchInvoices()
    }
  }, [currentBusiness, includeCancelled])

  useEffect(() => {
    filterInvoices()
  }, [invoices, searchQuery, invoiceTypeFilter, paymentStatusFilter, lifecycleFilter, dateRange])

  const fetchInvoices = async () => {
    if (!currentBusiness) return

    setIsLoading(true)
    try {
      const data = await invoiceService.listInvoices(currentBusiness.id, {
        include_cancelled: includeCancelled,
        limit: 100,
      })
      setInvoices(data.items)
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const filterInvoices = () => {
    let filtered = invoices

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (invoice) =>
          invoice.invoice_number.toLowerCase().includes(query) ||
          invoice.party_name.toLowerCase().includes(query) ||
          invoice.notes?.toLowerCase().includes(query)
      )
    }

    // Filter by invoice type
    if (invoiceTypeFilter !== "all") {
      filtered = filtered.filter((invoice) => invoice.invoice_type === invoiceTypeFilter)
    }

    // Filter by payment status
    if (paymentStatusFilter !== "all") {
      filtered = filtered.filter((invoice) => invoice.payment_status === paymentStatusFilter)
    }

    // Filter by lifecycle
    if (lifecycleFilter !== "all") {
      filtered = filtered.filter((invoice) => {
        if (lifecycleFilter === "cancelled") return invoice.is_cancelled
        if (lifecycleFilter === "revised") return !!invoice.reference_invoice_id
        return !invoice.is_cancelled && !invoice.reference_invoice_id
      })
    }

    // Filter by date range
    if (dateRange?.from && dateRange?.to) {
      filtered = filtered.filter((invoice) => {
        const invoiceDate = new Date(invoice.invoice_date)
        const fromDate = new Date(dateRange.from!)
        const toDate = new Date(dateRange.to!)
        // Set time to start/end of day for accurate comparison
        fromDate.setHours(0, 0, 0, 0)
        toDate.setHours(23, 59, 59, 999)
        return invoiceDate >= fromDate && invoiceDate <= toDate
      })
    }

    filtered = [...filtered].sort((a, b) => {
      if (a.is_cancelled !== b.is_cancelled) {
        return a.is_cancelled ? 1 : -1
      }

      return new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime()
    })

    setFilteredInvoices(filtered)
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

  const getTotalSales = () => {
    return invoices
      .filter((i) => i.invoice_type === "sales" && !i.is_cancelled)
      .reduce((sum, i) => sum + i.grand_total, 0)
  }

  const getTotalPurchases = () => {
    return invoices
      .filter((i) => i.invoice_type === "purchase" && !i.is_cancelled)
      .reduce((sum, i) => sum + i.grand_total, 0)
  }

  const getUnpaidCount = () => {
    return invoices.filter((i) => i.payment_status === "unpaid" && !i.is_cancelled).length
  }

  const getOverdueCount = () => {
    return invoices.filter((i) => i.payment_status === "overdue" && !i.is_cancelled).length
  }

  // Bulk operations handlers
  const toggleSelectAll = () => {
    if (selectedInvoices.size === filteredInvoices.length && filteredInvoices.length > 0) {
      setSelectedInvoices(new Set())
    } else {
      setSelectedInvoices(new Set(filteredInvoices.map(inv => inv.id)))
    }
  }

  const toggleSelectInvoice = (invoiceId: string) => {
    const newSelected = new Set(selectedInvoices)
    if (newSelected.has(invoiceId)) {
      newSelected.delete(invoiceId)
    } else {
      newSelected.add(invoiceId)
    }
    setSelectedInvoices(newSelected)
  }

  const handleBulkDownload = async () => {
    if (!currentBusiness || selectedInvoices.size === 0) return
    
    setIsDownloadingBulk(true)
    try {
      const invoicesToDownload = Array.from(selectedInvoices)
      let successCount = 0
      let failCount = 0
      
      for (const invoiceId of invoicesToDownload) {
        try {
          const invoice = invoices.find(inv => inv.id === invoiceId)
          if (!invoice) continue
          
          const blob = await invoiceService.downloadPdf(currentBusiness.id, invoiceId)
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${invoice.invoice_number}.pdf`
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
          
          successCount++
          // Add small delay to avoid overwhelming the browser
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (error) {
          console.error(`Failed to download invoice ${invoiceId}:`, error)
          failCount++
        }
      }
      
      if (successCount > 0) {
        toast.success(`Downloaded ${successCount} invoice(s)`)
      }
      if (failCount > 0) {
        toast.error(`Failed to download ${failCount} invoice(s)`)
      }
      
      setSelectedInvoices(new Set())
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsDownloadingBulk(false)
    }
  }

  const getPaymentStatusBadge = (status: PaymentStatus) => {
    switch (status) {
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

  const getInvoiceTypeBadge = (type: InvoiceType) => {
    switch (type) {
      case "sales":
        return <Badge variant="default">Sales</Badge>
      case "purchase":
        return <Badge variant="secondary">Purchase</Badge>
      case "credit_note":
        return <Badge variant="outline">Credit Note</Badge>
      case "debit_note":
        return <Badge variant="outline">Debit Note</Badge>
    }
  }

  const getLifecycleCounts = () => ({
    finalized: invoices.filter((invoice) => !invoice.is_cancelled && !invoice.reference_invoice_id).length,
    revised: invoices.filter((invoice) => !!invoice.reference_invoice_id).length,
    cancelled: invoices.filter((invoice) => invoice.is_cancelled).length,
  })

  const getLifecycleBadge = (invoice: Invoice) => {
    if (invoice.is_cancelled) {
      return (
        <Badge variant="outline" className="text-red-600 border-red-600">
          <XCircle className="h-3 w-3 mr-1" />
          Cancelled
        </Badge>
      )
    }

    if (invoice.reference_invoice_id) {
      return (
        <Badge variant="outline" className="text-blue-600 border-blue-600">
          <Copy className="h-3 w-3 mr-1" />
          Revised
        </Badge>
      )
    }

    return (
      <Badge variant="outline" className="text-emerald-600 border-emerald-600">
        Finalized
      </Badge>
    )
  }

  const getRevisionUrl = (invoice: Invoice) => {
    if (invoice.invoice_type !== "sales" && invoice.invoice_type !== "purchase") return null
    return `/invoices/create/${invoice.invoice_type}?source_invoice_id=${invoice.id}&mode=revise`
  }

  const handleReviseInvoice = (invoice: Invoice) => {
    const revisionUrl = getRevisionUrl(invoice)
    if (!revisionUrl) {
      toast.error("This invoice type cannot be revised.")
      return
    }

    router.push(revisionUrl)
  }

  const handleCancelInvoice = async () => {
    if (!currentBusiness || !invoiceToCancel) return

    setIsCancelling(true)
    try {
      await invoiceService.cancelInvoice(currentBusiness.id, invoiceToCancel.id, {
        cancel_reason: cancelReason || undefined,
      })
      toast.success("Invoice cancelled successfully")
      setIncludeCancelled(true)
      setLifecycleFilter("all")
      setInvoiceToCancel(null)
      setCancelReason("")
      await fetchInvoices()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsCancelling(false)
    }
  }

  const handleDownloadPdf = async (e: React.MouseEvent, invoiceId: string, invoiceNumber: string) => {
    e.stopPropagation() // Prevent navigation to detail page
    
    if (!currentBusiness) return

    try {
      const blob = await invoiceService.downloadPdf(currentBusiness.id, invoiceId)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${invoiceNumber}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success("Invoice downloaded successfully!")
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(`Failed to download: ${errorMessage}`)
    }
  }

  // Keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'n',
      ctrlKey: true,
      description: 'Create new invoice',
      callback: () => setShowCreateDropdown(true),
    },
    {
      key: 'f',
      ctrlKey: true,
      description: 'Focus search',
      callback: () => searchInputRef.current?.focus(),
    },
    {
      key: '/',
      description: 'Focus search',
      callback: () => searchInputRef.current?.focus(),
    },
    {
      key: 'a',
      ctrlKey: true,
      description: 'Select all invoices',
      callback: () => {
        if (filteredInvoices.length > 0) {
          toggleSelectAll();
        }
      },
    },
    {
      key: 'Escape',
      description: 'Clear selection',
      callback: () => {
        if (selectedInvoices.size > 0) {
          setSelectedInvoices(new Set());
        }
      },
    },
  ];

  useKeyboardShortcuts(shortcuts);

  if (!currentBusiness) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <PageLayout>
            <div className="flex min-h-screen items-center justify-center">
              <p className="text-muted-foreground">Please select a business first</p>
            </div>
          </PageLayout>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <PageLayout onRefresh={fetchInvoices}>
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
                  <BreadcrumbItem>
                    <BreadcrumbPage>Invoices</BreadcrumbPage>
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
                  <FileText className="h-5 w-5 md:h-6 md:w-6 lg:h-8 lg:w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Invoices</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                    <span className="hidden sm:inline">Manage sales and purchase invoices</span>
                    <span className="sm:hidden">Sales & purchases</span>
                  </p>
                </div>
              </div>
              {/* Desktop Create Button */}
              <DropdownMenu open={showCreateDropdown} onOpenChange={setShowCreateDropdown}>
                <DropdownMenuTrigger asChild>
                  <Button className="cursor-pointer w-full sm:w-auto hidden md:flex">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Invoice
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push("/invoices/create/sales")} className="cursor-pointer">
                    <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
                    Sales Invoice
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/invoices/create/purchase")} className="cursor-pointer">
                    <TrendingDown className="h-4 w-4 mr-2 text-red-600" />
                    Purchase Invoice
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Stats Cards - Mobile Optimized */}
            <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Total</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">{invoices.filter(i => !i.is_cancelled).length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Total Sales</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-green-600">
                  {formatCurrency(getTotalSales())}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Total Purchases</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-red-600">
                  {formatCurrency(getTotalPurchases())}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Unpaid / Overdue</CardTitle>
                <AlertCircle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-orange-600">
                  {getUnpaidCount()} / {getOverdueCount()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filters</span>
                  {(searchQuery || invoiceTypeFilter !== "all" || paymentStatusFilter !== "all" || lifecycleFilter !== "all" || dateRange) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("")
                        setInvoiceTypeFilter("all")
                        setPaymentStatusFilter("all")
                        setLifecycleFilter("all")
                        setDateRange(undefined)
                      }}
                      className="ml-auto cursor-pointer text-xs"
                    >
                      Clear All
                    </Button>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      ref={searchInputRef}
                      placeholder="Search invoices..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <DateRangePicker
                    value={dateRange}
                    onChange={setDateRange}
                    placeholder="Select date range"
                    className="w-full"
                  />
                  <Select
                    value={invoiceTypeFilter}
                    onValueChange={(value) => setInvoiceTypeFilter(value as InvoiceType | "all")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Invoice Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="purchase">Purchase</SelectItem>
                      <SelectItem value="credit_note">Credit Note</SelectItem>
                      <SelectItem value="debit_note">Debit Note</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={paymentStatusFilter}
                    onValueChange={(value) => setPaymentStatusFilter(value as PaymentStatus | "all")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Payment Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={lifecycleFilter}
                    onValueChange={(value) => setLifecycleFilter(value as "all" | "finalized" | "revised" | "cancelled")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Lifecycle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Lifecycle</SelectItem>
                      <SelectItem value="finalized">Finalized</SelectItem>
                      <SelectItem value="revised">Revised</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="cancelled"
                      checked={includeCancelled}
                      onCheckedChange={(checked) => setIncludeCancelled(checked as boolean)}
                    />
                    <label htmlFor="cancelled" className="text-sm cursor-pointer">
                      Show Cancelled
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoices List */}
          <Card>
            <CardHeader>
              <CardTitle>All Invoices ({filteredInvoices.length})</CardTitle>
              <CardDescription>
                Click on an invoice to view details
                <span className="ml-2 text-xs text-muted-foreground">
                  Finalized {getLifecycleCounts().finalized} • Revised {getLifecycleCounts().revised} • Cancelled {getLifecycleCounts().cancelled}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedInvoices.size > 0 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-muted/50 rounded-lg border mb-4 gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={true}
                      onCheckedChange={() => setSelectedInvoices(new Set())}
                    />
                    <span className="text-sm font-medium">
                      {selectedInvoices.size} invoice(s) selected
                    </span>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedInvoices(new Set())}
                      className="cursor-pointer flex-1 sm:flex-none"
                    >
                      Clear Selection
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleBulkDownload}
                      disabled={isDownloadingBulk}
                      className="cursor-pointer flex-1 sm:flex-none"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {isDownloadingBulk ? "Downloading..." : "Download PDFs"}
                    </Button>
                  </div>
                </div>
              )}
              
              {filteredInvoices.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg mb-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedInvoices.size === filteredInvoices.length && filteredInvoices.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                    <span className="text-sm text-muted-foreground">
                      Select All
                    </span>
                  </div>
                </div>
              )}
              
              {isLoading ? (
                <ListSkeleton count={5} type="invoice" />
              ) : filteredInvoices.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title={
                    searchQuery || invoiceTypeFilter !== "all" || paymentStatusFilter !== "all" || lifecycleFilter !== "all"
                      ? "No invoices found"
                      : "No invoices yet"
                  }
                  description={
                    searchQuery || invoiceTypeFilter !== "all" || paymentStatusFilter !== "all" || lifecycleFilter !== "all"
                      ? "Try adjusting your filters or search query to find what you're looking for."
                      : "Get started by creating your first invoice. You can create sales invoices for customers or purchase invoices for suppliers."
                  }
                  action={
                    searchQuery || invoiceTypeFilter !== "all" || paymentStatusFilter !== "all" || lifecycleFilter !== "all"
                      ? undefined
                      : {
                          label: "Create Sales Invoice",
                          onClick: () => router.push("/invoices/create/sales"),
                        }
                  }
                  secondaryAction={
                    searchQuery || invoiceTypeFilter !== "all" || paymentStatusFilter !== "all" || lifecycleFilter !== "all"
                      ? undefined
                      : {
                          label: "Create Purchase Invoice",
                          onClick: () => router.push("/invoices/create/purchase"),
                        }
                  }
                />
              ) : (
                <>
                  {/* Desktop View */}
                  <div className="hidden md:block space-y-3">
                    {filteredInvoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className={`flex items-center gap-3 p-4 border rounded-lg transition-colors ${
                          invoice.is_cancelled
                            ? "border-red-200 bg-red-50/60 dark:border-red-900/40 dark:bg-red-950/20"
                            : "hover:bg-accent/50"
                        }`}
                      >
                        <div onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedInvoices.has(invoice.id)}
                            onCheckedChange={() => toggleSelectInvoice(invoice.id)}
                          />
                        </div>
                        <div
                          onClick={() => router.push(`/invoices/${invoice.id}`)}
                          className="flex items-center justify-between flex-1 cursor-pointer gap-3"
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div
                              className={`p-2 rounded-full flex-shrink-0 ${
                                invoice.is_cancelled
                                  ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                                  : "bg-primary/10 text-primary"
                              }`}
                            >
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p
                                  className={`font-medium truncate ${
                                    invoice.is_cancelled
                                      ? "text-red-700 line-through decoration-red-400/70 dark:text-red-300"
                                      : ""
                                  }`}
                                >
                                  {invoice.invoice_number}
                                </p>
                                {getInvoiceTypeBadge(invoice.invoice_type)}
                                {getPaymentStatusBadge(invoice.payment_status)}
                                {getLifecycleBadge(invoice)}
                              </div>
                              <div className={`flex items-center gap-4 mt-1 text-sm ${invoice.is_cancelled ? "text-red-600/80 dark:text-red-300/80" : "text-muted-foreground"}`}>
                                <span className="truncate">{invoice.party_name.trim().toUpperCase()}</span>
                                <span>{formatDate(invoice.invoice_date)}</span>
                                {invoice.due_date && (
                                  <span>Due: {formatDate(invoice.due_date)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 flex-shrink-0">
                            <div className="text-right">
                              <p className={`font-semibold ${invoice.is_cancelled ? "text-red-700 dark:text-red-300" : ""}`}>
                                {formatCurrency(invoice.grand_total)}
                              </p>
                              {invoice.balance_due > 0 && (
                                <p className="text-xs text-orange-600">
                                  Due: {formatCurrency(invoice.balance_due)}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => handleDownloadPdf(e, invoice.id, invoice.invoice_number)}
                              className="cursor-pointer"
                              title="Download PDF"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="cursor-pointer">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => router.push(`/invoices/${invoice.id}`)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </DropdownMenuItem>
                                {(invoice.invoice_type === "sales" || invoice.invoice_type === "purchase") && (
                                  <DropdownMenuItem onClick={() => handleReviseInvoice(invoice)}>
                                    <Copy className="h-4 w-4 mr-2" />
                                    {invoice.is_cancelled ? "Create Revised Invoice" : "Revise as New"}
                                  </DropdownMenuItem>
                                )}
                                {!invoice.is_cancelled && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => setInvoiceToCancel(invoice)}
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
                      </div>
                    ))}
                  </div>

                  {/* Mobile View with Swipe Actions */}
                  <MobileTable>
                    {filteredInvoices.map((invoice) => (
                      <SwipeableItem
                        key={invoice.id}
                        rightActions={[
                          {
                            label: "View",
                            icon: <Eye className="h-4 w-4" />,
                            onClick: () => router.push(`/invoices/${invoice.id}`),
                          },
                          {
                            label: "Download",
                            icon: <Download className="h-4 w-4" />,
                            onClick: () => handleDownloadPdf(
                              { stopPropagation: () => {} } as React.MouseEvent,
                              invoice.id,
                              invoice.invoice_number
                            ),
                            variant: "success",
                          },
                        ]}
                      >
                        <MobileTableRow>
                          {invoice.is_cancelled && (
                            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                              This invoice is cancelled and kept for history.
                            </div>
                          )}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Checkbox
                                checked={selectedInvoices.has(invoice.id)}
                                onCheckedChange={() => toggleSelectInvoice(invoice.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`font-medium text-sm truncate ${
                                    invoice.is_cancelled
                                      ? "text-red-700 line-through decoration-red-400/70 dark:text-red-300"
                                      : ""
                                  }`}
                                >
                                  {invoice.invoice_number}
                                </p>
                                <p className="text-xs text-muted-foreground truncate mt-0.5">{invoice.party_name.trim().toUpperCase()}</p>
                              </div>
                            </div>
                            <div className="flex gap-1.5 flex-shrink-0">
                              {getInvoiceTypeBadge(invoice.invoice_type)}
                              {getLifecycleBadge(invoice)}
                            </div>
                          </div>
                          <MobileTableCell label="Amount">
                            <span className="font-semibold">{formatCurrency(invoice.grand_total)}</span>
                          </MobileTableCell>
                          <MobileTableCell label="Status">
                            {getPaymentStatusBadge(invoice.payment_status)}
                          </MobileTableCell>
                          <MobileTableCell label="Date">
                            {formatDate(invoice.invoice_date)}
                          </MobileTableCell>
                          {invoice.balance_due > 0 && (
                            <MobileTableCell label="Balance Due">
                              <span className="text-orange-600 font-medium">
                                {formatCurrency(invoice.balance_due)}
                              </span>
                            </MobileTableCell>
                          )}
                          <div className="flex gap-2 mt-3 pt-3 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/invoices/${invoice.id}`);
                              }}
                              className="cursor-pointer flex-1"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadPdf(e, invoice.id, invoice.invoice_number);
                              }}
                              className="cursor-pointer flex-1"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                            {(invoice.invoice_type === "sales" || invoice.invoice_type === "purchase") && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReviseInvoice(invoice);
                                }}
                                className="cursor-pointer flex-1"
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Revise
                              </Button>
                            )}
                          </div>
                          {!invoice.is_cancelled && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInvoiceToCancel(invoice);
                              }}
                              className="cursor-pointer mt-2 w-full text-red-600"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancel Invoice
                            </Button>
                          )}
                        </MobileTableRow>
                      </SwipeableItem>
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
              label: "Sales Invoice",
              icon: <TrendingUp className="h-5 w-5" />,
              onClick: () => router.push("/invoices/create/sales"),
            },
            {
              label: "Purchase Invoice",
              icon: <TrendingDown className="h-5 w-5" />,
              onClick: () => router.push("/invoices/create/purchase"),
            },
          ]}
        />
        
        {/* Keyboard Shortcuts Dialog */}
        <KeyboardShortcutsDialog shortcuts={shortcuts} />
        <AlertDialog
          open={!!invoiceToCancel}
          onOpenChange={(open) => {
            if (!open) {
              setInvoiceToCancel(null)
              setCancelReason("")
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Invoice</AlertDialogTitle>
              <AlertDialogDescription>
                {invoiceToCancel
                  ? `Cancel ${invoiceToCancel.invoice_number}. This keeps the original invoice in history and marks it as cancelled.`
                  : "Cancel this invoice."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason</label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Enter cancellation reason"
                rows={3}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
              <Button variant="destructive" onClick={handleCancelInvoice} disabled={isCancelling}>
                {isCancelling ? "Cancelling..." : "Cancel Invoice"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </PageLayout>
      </SidebarInset>
    </SidebarProvider>
  )
}
