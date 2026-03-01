"use client"

import { useEffect, useState } from "react"
import { useBusinessStore } from "@/store/useBusinessStore"
import { ledgerService } from "@/services/ledger.service"
import { partyService } from "@/services/party.service"
import type { LedgerEntry } from "@/types/ledger"
import type { Party } from "@/types/party"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/error-handler"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  BookOpen,
  Search,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  FileSpreadsheet,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PageLayout } from "@/components/layout/page-layout"
import { FloatingActionButton } from "@/components/ui/floating-action-button"
import { MobileTable, MobileTableRow } from "@/components/ui/mobile-table"

export function LedgerStatementPage() {
  const { currentBusiness } = useBusinessStore()
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingParties, setIsLoadingParties] = useState(true)
  const [selectedPartyId, setSelectedPartyId] = useState<string>("")
  const [fromDate, setFromDate] = useState<string>("")
  const [toDate, setToDate] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (currentBusiness) {
      fetchParties()
      fetchLedgerEntries()
    }
  }, [currentBusiness])

  useEffect(() => {
    if (currentBusiness) {
      fetchLedgerEntries()
    }
  }, [selectedPartyId, fromDate, toDate])

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

  const fetchLedgerEntries = async () => {
    if (!currentBusiness) return

    setIsLoading(true)
    try {
      const data = await ledgerService.getLedgerStatement(currentBusiness.id, {
        party_id: selectedPartyId || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        limit: 100,
      })
      setEntries(data.items)
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredEntries = entries.filter((entry) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      entry.party_name.toLowerCase().includes(query) ||
      entry.description.toLowerCase().includes(query) ||
      entry.entry_type.toLowerCase().includes(query)
    )
  })

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

  const getEntryTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      invoice: "Invoice",
      payment: "Payment",
      opening_balance: "Opening Balance",
      adjustment: "Adjustment",
    }
    return labels[type] || type
  }

  const getEntryTypeBadge = (type: string) => {
    const variants: Record<string, string> = {
      invoice: "default",
      payment: "secondary",
      opening_balance: "outline",
      adjustment: "destructive",
    }
    return variants[type] || "default"
  }

  const getTotalDebit = () => {
    return filteredEntries.reduce((sum, entry) => sum + entry.debit, 0)
  }

  const getTotalCredit = () => {
    return filteredEntries.reduce((sum, entry) => sum + entry.credit, 0)
  }

  const getNetBalance = () => {
    return getTotalDebit() - getTotalCredit()
  }

  const exportToCSV = () => {
    // Prepare CSV data
    const headers = ["Date", "Party", "Type", "Description", "Debit", "Credit", "Balance"]
    const rows = filteredEntries.map(entry => [
      formatDate(entry.entry_date),
      entry.party_name,
      getEntryTypeLabel(entry.entry_type),
      entry.description,
      entry.debit > 0 ? entry.debit.toFixed(2) : "",
      entry.credit > 0 ? entry.credit.toFixed(2) : "",
      entry.balance_after.toFixed(2)
    ])

    // Add summary row
    rows.push([])
    rows.push(["", "", "", "Total", getTotalDebit().toFixed(2), getTotalCredit().toFixed(2), ""])
    rows.push(["", "", "", "Net Balance", "", "", Math.abs(getNetBalance()).toFixed(2) + " " + (getNetBalance() >= 0 ? "Receivable" : "Payable")])

    // Convert to CSV string
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n")

    // Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `ledger_statement_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Ledger exported to CSV successfully!")
  }

  const exportToExcel = () => {
    // Prepare Excel data (using HTML table format that Excel can open)
    const headers = ["Date", "Party", "Type", "Description", "Debit", "Credit", "Balance"]
    const rows = filteredEntries.map(entry => [
      formatDate(entry.entry_date),
      entry.party_name,
      getEntryTypeLabel(entry.entry_type),
      entry.description,
      entry.debit > 0 ? entry.debit.toFixed(2) : "",
      entry.credit > 0 ? entry.credit.toFixed(2) : "",
      entry.balance_after.toFixed(2)
    ])

    // Add summary rows
    rows.push([])
    rows.push(["", "", "", "Total", getTotalDebit().toFixed(2), getTotalCredit().toFixed(2), ""])
    rows.push(["", "", "", "Net Balance", "", "", Math.abs(getNetBalance()).toFixed(2) + " " + (getNetBalance() >= 0 ? "Receivable" : "Payable")])

    // Create HTML table
    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
          <meta charset="utf-8">
          <style>
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #4CAF50; color: white; font-weight: bold; }
            .number { text-align: right; }
            .debit { color: #dc2626; }
            .credit { color: #16a34a; }
          </style>
        </head>
        <body>
          <h2>Ledger Statement - ${currentBusiness?.name || 'Business'}</h2>
          <p>Generated on: ${new Date().toLocaleString('en-IN')}</p>
          <table>
            <thead>
              <tr>
                ${headers.map(h => `<th>${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${rows.map(row => `
                <tr>
                  ${row.map((cell, idx) => {
                    if (idx === 4 && cell) return `<td class="number debit">${cell}</td>`
                    if (idx === 5 && cell) return `<td class="number credit">${cell}</td>`
                    if (idx === 6) return `<td class="number">${cell}</td>`
                    return `<td>${cell}</td>`
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `

    // Download
    const blob = new Blob([htmlContent], { type: "application/vnd.ms-excel" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `ledger_statement_${new Date().toISOString().split('T')[0]}.xls`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Ledger exported to Excel successfully!")
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
        <PageLayout onRefresh={fetchLedgerEntries}>
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
                  <BreadcrumbItem>
                    <BreadcrumbPage>Ledger</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          {/* Main Content */}
          <div className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6 pb-20 md:pb-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="p-2 md:p-3 rounded-xl bg-primary/10 border-2 border-primary/20">
                <BookOpen className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Ledger Statement</h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  View all accounting entries
                </p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="hidden md:flex cursor-pointer">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToCSV} className="cursor-pointer">
                  <FileText className="h-4 w-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToExcel} className="cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs md:text-sm font-medium">Debit</CardTitle>
                <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-lg md:text-2xl font-bold text-red-600">
                  {formatCurrency(getTotalDebit())}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs md:text-sm font-medium">Credit</CardTitle>
                <TrendingDown className="h-3 w-3 md:h-4 md:w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-lg md:text-2xl font-bold text-green-600">
                  {formatCurrency(getTotalCredit())}
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-2 md:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs md:text-sm font-medium">Net Balance</CardTitle>
                <BookOpen className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-lg md:text-2xl font-bold ${
                  getNetBalance() >= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {formatCurrency(Math.abs(getNetBalance()))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {getNetBalance() >= 0 ? "Receivable" : "Payable"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="flex flex-col gap-3 md:gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs md:text-sm font-medium">Filters</span>
                </div>
                <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search entries..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 text-sm"
                    />
                  </div>
                  <Select
                    value={selectedPartyId || "all"}
                    onValueChange={(value) => setSelectedPartyId(value === "all" ? "" : value)}
                    disabled={isLoadingParties}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="All Parties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Parties</SelectItem>
                      {parties.map((party) => (
                        <SelectItem key={party.id} value={party.id}>
                          {party.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    placeholder="From Date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    type="date"
                    placeholder="To Date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ledger Entries Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Ledger Entries ({filteredEntries.length})</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                All accounting transactions and entries
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery || selectedPartyId || fromDate || toDate
                      ? "No entries found matching your filters"
                      : "No ledger entries yet"}
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Party</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Debit</TableHead>
                          <TableHead className="text-right">Credit</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEntries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="font-medium">
                              {formatDate(entry.entry_date)}
                            </TableCell>
                            <TableCell>{entry.party_name}</TableCell>
                            <TableCell>
                              <Badge variant={getEntryTypeBadge(entry.entry_type) as "default" | "secondary" | "outline" | "destructive"}>
                                {getEntryTypeLabel(entry.entry_type)}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {entry.description}
                            </TableCell>
                            <TableCell className="text-right">
                              {entry.debit > 0 ? (
                                <span className="text-red-600 font-medium">
                                  {formatCurrency(entry.debit)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {entry.credit > 0 ? (
                                <span className="text-green-600 font-medium">
                                  {formatCurrency(entry.credit)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(entry.balance_after)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Cards */}
                  <MobileTable className="md:hidden">
                    {filteredEntries.map((entry) => (
                      <MobileTableRow key={entry.id}>
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{entry.party_name}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(entry.entry_date)}</p>
                            </div>
                            <Badge variant={getEntryTypeBadge(entry.entry_type) as "default" | "secondary" | "outline" | "destructive"} className="text-xs">
                              {getEntryTypeLabel(entry.entry_type)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{entry.description}</p>
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                            <div>
                              <p className="text-xs text-muted-foreground">Debit</p>
                              <p className="text-sm font-medium text-red-600">
                                {entry.debit > 0 ? formatCurrency(entry.debit) : "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Credit</p>
                              <p className="text-sm font-medium text-green-600">
                                {entry.credit > 0 ? formatCurrency(entry.credit) : "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Balance</p>
                              <p className="text-sm font-medium">{formatCurrency(entry.balance_after)}</p>
                            </div>
                          </div>
                        </div>
                      </MobileTableRow>
                    ))}
                  </MobileTable>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Mobile FAB for Export */}
        <FloatingActionButton
          icon={<Download className="h-6 w-6" />}
          label="Export"
          actions={[
            {
              icon: <FileText className="h-5 w-5" />,
              label: "CSV",
              onClick: exportToCSV,
            },
            {
              icon: <FileSpreadsheet className="h-5 w-5" />,
              label: "Excel",
              onClick: exportToExcel,
            },
          ]}
          className="md:hidden"
        />
      </PageLayout>
      </SidebarInset>
    </SidebarProvider>
  )
}
