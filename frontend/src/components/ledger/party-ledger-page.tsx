"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
  Users,
  Download,
  FileText,
  FileSpreadsheet,
  ArrowLeft
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

export function PartyLedgerPage() {
  const router = useRouter()
  const { currentBusiness } = useBusinessStore()
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingParties, setIsLoadingParties] = useState(true)
  const [selectedPartyId, setSelectedPartyId] = useState<string>("")
  const [selectedParty, setSelectedParty] = useState<Party | null>(null)
  const [fromDate, setFromDate] = useState<string>("")
  const [toDate, setToDate] = useState<string>("")

  useEffect(() => {
    if (currentBusiness) {
      fetchParties()
    }
  }, [currentBusiness])

  useEffect(() => {
    if (currentBusiness && selectedPartyId) {
      fetchLedgerEntries()
      const party = parties.find(p => p.id === selectedPartyId)
      setSelectedParty(party || null)
    } else {
      setEntries([])
      setSelectedParty(null)
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
    if (!currentBusiness || !selectedPartyId) return

    setIsLoading(true)
    try {
      const data = await ledgerService.getLedgerStatement(currentBusiness.id, {
        party_id: selectedPartyId,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        limit: 200,
      })
      setEntries(data.items)
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
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
    return entries.reduce((sum, entry) => sum + entry.debit, 0)
  }

  const getTotalCredit = () => {
    return entries.reduce((sum, entry) => sum + entry.credit, 0)
  }

  const getCurrentBalance = () => {
    return entries.length > 0 ? entries[0].balance_after : 0
  }

  const exportToCSV = () => {
    if (!selectedParty) return

    const headers = ["Date", "Type", "Description", "Debit", "Credit", "Balance"]
    const rows = entries.map(entry => [
      formatDate(entry.entry_date),
      getEntryTypeLabel(entry.entry_type),
      entry.description,
      entry.debit > 0 ? entry.debit.toFixed(2) : "",
      entry.credit > 0 ? entry.credit.toFixed(2) : "",
      entry.balance_after.toFixed(2)
    ])

    rows.push([])
    rows.push(["", "", "Total", getTotalDebit().toFixed(2), getTotalCredit().toFixed(2), ""])
    rows.push(["", "", "Current Balance", "", "", getCurrentBalance().toFixed(2)])

    const csvContent = [
      [`Party Ledger - ${selectedParty.name}`],
      [`Generated on: ${new Date().toLocaleString('en-IN')}`],
      [],
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `party_ledger_${selectedParty.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Party ledger exported to CSV successfully!")
  }

  const exportToExcel = () => {
    if (!selectedParty) return

    const headers = ["Date", "Type", "Description", "Debit", "Credit", "Balance"]
    const rows = entries.map(entry => [
      formatDate(entry.entry_date),
      getEntryTypeLabel(entry.entry_type),
      entry.description,
      entry.debit > 0 ? entry.debit.toFixed(2) : "",
      entry.credit > 0 ? entry.credit.toFixed(2) : "",
      entry.balance_after.toFixed(2)
    ])

    rows.push([])
    rows.push(["", "", "Total", getTotalDebit().toFixed(2), getTotalCredit().toFixed(2), ""])
    rows.push(["", "", "Current Balance", "", "", getCurrentBalance().toFixed(2)])

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
          <h2>Party Ledger - ${selectedParty.name}</h2>
          <p>Business: ${currentBusiness?.name || 'Business'}</p>
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
                    if (idx === 3 && cell) return `<td class="number debit">${cell}</td>`
                    if (idx === 4 && cell) return `<td class="number credit">${cell}</td>`
                    if (idx === 5) return `<td class="number">${cell}</td>`
                    return `<td>${cell}</td>`
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `

    const blob = new Blob([htmlContent], { type: "application/vnd.ms-excel" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `party_ledger_${selectedParty.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xls`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Party ledger exported to Excel successfully!")
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
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/ledger">Ledger</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Party Ledger</BreadcrumbPage>
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
                <Users className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Party Ledger</h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  View ledger for individual parties
                </p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" size="sm" onClick={() => router.push("/ledger")} className="flex-1 sm:flex-none cursor-pointer active:scale-95">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              {selectedPartyId && (
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
              )}
            </div>
          </div>

          {/* Party Selection */}
          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-3">
                <div className="md:col-span-1">
                  <label className="text-xs md:text-sm font-medium mb-2 block">Select Party</label>
                  <Select
                    value={selectedPartyId || undefined}
                    onValueChange={setSelectedPartyId}
                    disabled={isLoadingParties}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder={isLoadingParties ? "Loading parties..." : "Choose a party"} />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingParties ? (
                        <div className="flex items-center justify-center p-4">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                      ) : parties.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          No parties found
                        </div>
                      ) : (
                        parties.map((party) => (
                          <SelectItem key={party.id} value={party.id}>
                            {party.name} ({party.party_type})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {isLoadingParties && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Loading parties...
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs md:text-sm font-medium mb-2 block">From Date</label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    disabled={!selectedPartyId}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs md:text-sm font-medium mb-2 block">To Date</label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    disabled={!selectedPartyId}
                    className="text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedParty && (
            <>
              {/* Party Info & Summary */}
              <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-4">
                <Card className="col-span-2 md:col-span-1">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs md:text-sm font-medium">Party Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <p className="font-semibold text-sm md:text-base truncate">{selectedParty.name}</p>
                      <Badge className="text-xs">{selectedParty.party_type}</Badge>
                      {selectedParty.phone && (
                        <p className="text-xs md:text-sm text-muted-foreground">{selectedParty.phone}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs md:text-sm font-medium">Debit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg md:text-2xl font-bold text-red-600">
                      {formatCurrency(getTotalDebit())}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs md:text-sm font-medium">Credit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg md:text-2xl font-bold text-green-600">
                      {formatCurrency(getTotalCredit())}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs md:text-sm font-medium">Balance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-lg md:text-2xl font-bold ${
                      getCurrentBalance() >= 0 ? "text-green-600" : "text-red-600"
                    }`}>
                      {formatCurrency(Math.abs(getCurrentBalance()))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getCurrentBalance() >= 0 ? "To Receive" : "To Pay"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Ledger Entries Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Transactions ({entries.length})</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    All transactions for {selectedParty.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    </div>
                  ) : entries.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">
                        No transactions found for this party
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
                              <TableHead>Type</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead className="text-right">Debit</TableHead>
                              <TableHead className="text-right">Credit</TableHead>
                              <TableHead className="text-right">Balance</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {entries.map((entry) => (
                              <TableRow key={entry.id}>
                                <TableCell className="font-medium">
                                  {formatDate(entry.entry_date)}
                                </TableCell>
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
                        {entries.map((entry) => (
                          <MobileTableRow key={entry.id}>
                            <div className="space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground">{formatDate(entry.entry_date)}</p>
                                  <p className="text-xs text-muted-foreground truncate mt-1">{entry.description}</p>
                                </div>
                                <Badge variant={getEntryTypeBadge(entry.entry_type) as "default" | "secondary" | "outline" | "destructive"} className="text-xs">
                                  {getEntryTypeLabel(entry.entry_type)}
                                </Badge>
                              </div>
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
            </>
          )}

          {!selectedPartyId && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 md:py-12">
                <Users className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground mb-4" />
                <h3 className="text-base md:text-lg font-semibold mb-2">Select a Party</h3>
                <p className="text-xs md:text-sm text-muted-foreground text-center max-w-md px-4">
                  Choose a party from the dropdown above to view their complete ledger statement
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Mobile FAB for Export */}
        {selectedPartyId && (
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
        )}
      </PageLayout>
      </SidebarInset>
    </SidebarProvider>
  )
}
