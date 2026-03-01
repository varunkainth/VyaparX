"use client"

import { useRouter } from "next/navigation"
import { useBusinessStore } from "@/store/useBusinessStore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Building2,
  Plus,
  ArrowLeft,
  CreditCard,
  TrendingUp,
  TrendingDown
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
import { PageLayout } from "@/components/layout/page-layout"

export function BankAccountsPage() {
  const router = useRouter()
  const { currentBusiness } = useBusinessStore()

  // Mock data - replace with actual API call when backend is ready
  const bankAccounts = [
    {
      id: "1",
      account_name: "Business Current Account",
      bank_name: "HDFC Bank",
      account_no: "****1234",
      account_type: "current",
      current_balance: 250000,
      is_default: true,
      is_active: true,
    },
    {
      id: "2",
      account_name: "Savings Account",
      bank_name: "ICICI Bank",
      account_no: "****5678",
      account_type: "savings",
      current_balance: 150000,
      is_default: false,
      is_active: true,
    },
  ]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount)
  }

  const getTotalBalance = () => {
    return bankAccounts.reduce((sum, acc) => sum + acc.current_balance, 0)
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
        <PageLayout>
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
                    <BreadcrumbPage>Bank Accounts</BreadcrumbPage>
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
                <Building2 className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Bank Accounts</h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  Manage your business accounts
                </p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" size="sm" onClick={() => router.push("/ledger")} className="flex-1 sm:flex-none cursor-pointer active:scale-95">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button size="sm" className="flex-1 sm:flex-none cursor-pointer active:scale-95">
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </div>
          </div>

          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Total Balance</CardTitle>
              <CardDescription className="text-xs md:text-sm">Combined balance across all accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-4xl font-bold text-primary">
                {formatCurrency(getTotalBalance())}
              </div>
              <p className="text-xs md:text-sm text-muted-foreground mt-2">
                Across {bankAccounts.length} active accounts
              </p>
            </CardContent>
          </Card>

          {/* Bank Accounts List */}
          <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
            {bankAccounts.map((account) => (
              <Card key={account.id} className="hover:shadow-lg transition-shadow cursor-pointer active:scale-98">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <CreditCard className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-sm md:text-lg">{account.account_name}</CardTitle>
                        <CardDescription className="text-xs md:text-sm">{account.bank_name}</CardDescription>
                      </div>
                    </div>
                    {account.is_default && (
                      <Badge variant="secondary" className="text-xs">Default</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs md:text-sm text-muted-foreground">Account Number</span>
                    <span className="font-mono font-medium text-xs md:text-sm">{account.account_no}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs md:text-sm text-muted-foreground">Account Type</span>
                    <Badge variant="outline" className="capitalize text-xs">
                      {account.account_type}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-xs md:text-sm font-medium">Current Balance</span>
                    <span className="text-xl md:text-2xl font-bold text-primary">
                      {formatCurrency(account.current_balance)}
                    </span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1 text-xs cursor-pointer active:scale-95">
                      <TrendingUp className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                      <span className="hidden sm:inline">View </span>Transactions
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 text-xs cursor-pointer active:scale-95">
                      <TrendingDown className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                      Statement
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Coming Soon Notice */}
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-8 md:py-12">
              <Building2 className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground mb-4" />
              <h3 className="text-base md:text-lg font-semibold mb-2">Bank Account Management</h3>
              <p className="text-xs md:text-sm text-muted-foreground text-center max-w-md px-4">
                Full bank account management features including transactions, statements, and reconciliation are coming soon. The accounts shown above are sample data.
              </p>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
      </SidebarInset>
    </SidebarProvider>
  )
}
