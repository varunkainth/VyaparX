"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { analyticsService } from "@/services/analytics.service"
import { useBusinessStore } from "@/store/useBusinessStore"
import type { AnalyticsData } from "@/types/analytics"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/error-handler"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Wallet,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

// ── Color palette ────────────────────────────────────────────────────────────
const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899"]

const PIE_COLORS: Record<string, string> = {
  cash: "#22c55e",
  upi: "#6366f1",
  bank_transfer: "#3b82f6",
  cheque: "#f59e0b",
  credit: "#ef4444",
  other: "#a855f7",
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
interface TooltipPayloadEntry {
  name: string
  value: number
  color?: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}

function CustomAreaTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border bg-background/95 backdrop-blur-sm shadow-xl p-3 text-sm">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-muted-foreground capitalize">{entry.name}:</span>
          <span className="font-medium">{formatCurrencyShort(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

interface PieTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    payload: { percentage: number }
  }>
}

function CustomPieTooltip({ active, payload }: PieTooltipProps) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="rounded-xl border bg-background/95 backdrop-blur-sm shadow-xl p-3 text-sm">
      <p className="font-semibold capitalize">{item.name.replace(/_/g, " ")}</p>
      <p className="text-muted-foreground">{formatCurrencyShort(item.value)}</p>
      <p className="text-primary font-medium">{item.payload.percentage.toFixed(1)}%</p>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatCurrencyShort(amount: number) {
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(1)}L`
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(1)}K`
  return `₹${amount}`
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  })
}

function calculateChange(current: number, previous: number) {
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}

// ── Stat card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  title: string
  value: string
  change: number
  previousLabel: string
  icon: React.ElementType
  colorClass: string
  bgGradient: string
  positiveIsGood?: boolean
}

function StatCard({
  title,
  value,
  change,
  previousLabel,
  icon: Icon,
  colorClass,
  bgGradient,
  positiveIsGood = true,
}: StatCardProps) {
  const isPositive = change >= 0
  const isGood = positiveIsGood ? isPositive : !isPositive

  return (
    <Card className="relative overflow-hidden border-0 shadow-md">
      <div className={`absolute inset-0 opacity-20 dark:opacity-10 ${bgGradient}`} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
        <CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle>
        <div className="p-2 rounded-xl bg-background/80 backdrop-blur-sm">
          <Icon className={`h-4 w-4 ${colorClass}`} />
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
        <div className="flex items-center gap-1.5 mt-2">
          <span
            className={`flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
              isGood
                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                : "bg-red-500/10 text-red-600 dark:text-red-400"
            }`}
          >
            {isPositive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {Math.abs(change).toFixed(1)}%
          </span>
          <span className="text-xs text-muted-foreground">{previousLabel}</span>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Custom bar X-axis tick (theme-aware) ─────────────────────────────────────
interface CustomTickProps {
  x?: number
  y?: number
  payload?: { value: string }
}

function CustomBarTick({ x = 0, y = 0, payload }: CustomTickProps) {
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={4}
        textAnchor="end"
        transform="rotate(-35)"
        fontSize={10}
        className="fill-muted-foreground"
      >
        {payload?.value}
      </text>
    </g>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function AnalyticsPage() {
  const router = useRouter()
  const { currentBusiness } = useBusinessStore()
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState("30")

  const fetchAnalytics = async () => {
    if (!currentBusiness) return
    setIsLoading(true)
    try {
      const data = await analyticsService.getAnalytics(currentBusiness.id, parseInt(selectedPeriod))
      setAnalyticsData(data)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (currentBusiness) fetchAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBusiness, selectedPeriod])

  if (!currentBusiness) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Please select a business first</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6 pb-20 md:pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Skeleton className="h-8 md:h-9 w-40 md:w-48" />
          <Skeleton className="h-9 md:h-10 w-full sm:w-32" />
        </div>
        <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-3">
          {[1, 2, 3].map((i) => <Card key={i}><CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader><CardContent><Skeleton className="h-7 md:h-8 w-28 md:w-32" /><Skeleton className="h-3 w-32 md:w-40 mt-2" /></CardContent></Card>)}
        </div>
        <Skeleton className="h-64 md:h-80 w-full rounded-xl" />
        <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2">
          <Skeleton className="h-56 md:h-64 rounded-xl" />
          <Skeleton className="h-56 md:h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Failed to load analytics data</p>
      </div>
    )
  }

  const {
    monthly_comparison,
    time_series,
    payment_modes,
    top_selling_items,
    top_customers,
    top_suppliers,
  } = analyticsData

  const salesChange = calculateChange(
    monthly_comparison.current_month.sales,
    monthly_comparison.last_month.sales
  )
  const purchasesChange = calculateChange(
    monthly_comparison.current_month.purchases,
    monthly_comparison.last_month.purchases
  )
  const profitChange = calculateChange(
    monthly_comparison.current_month.profit,
    monthly_comparison.last_month.profit
  )

  // Prepare chart data
  const chartData = time_series.map((item) => ({
    date: formatDate(item.date),
    Sales: item.sales,
    Purchases: item.purchases,
    Profit: item.profit,
  }))

  const pieData = payment_modes.map((mode) => ({
    name: mode.category,
    value: mode.value,
    percentage: mode.percentage,
  }))

  const barData = top_selling_items.slice(0, 6).map((item) => ({
    name: item.name.length > 14 ? item.name.slice(0, 14) + "…" : item.name,
    Revenue: item.revenue,
    Qty: item.quantity,
  }))

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6 pb-20 md:pb-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="p-2 md:p-2.5 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
            <BarChart3 className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Analytics</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">
              Insights &amp; trends for <span className="font-medium text-foreground">{currentBusiness.name}</span>
            </p>
          </div>
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-full sm:w-36 h-9 md:h-10 text-sm">
            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-3">
        <StatCard
          title="Total Sales"
          value={formatCurrency(monthly_comparison.current_month.sales)}
          change={salesChange}
          previousLabel="vs last month"
          icon={ShoppingCart}
          colorClass="text-indigo-500"
          bgGradient="bg-gradient-to-br from-indigo-500 to-indigo-700"
          positiveIsGood={true}
        />
        <StatCard
          title="Total Purchases"
          value={formatCurrency(monthly_comparison.current_month.purchases)}
          change={purchasesChange}
          previousLabel="vs last month"
          icon={Package}
          colorClass="text-amber-500"
          bgGradient="bg-gradient-to-br from-amber-400 to-orange-500"
          positiveIsGood={false}
        />
        <StatCard
          title="Net Profit"
          value={formatCurrency(monthly_comparison.current_month.profit)}
          change={profitChange}
          previousLabel="vs last month"
          icon={DollarSign}
          colorClass="text-emerald-500"
          bgGradient="bg-gradient-to-br from-emerald-500 to-teal-600"
          positiveIsGood={true}
        />
      </div>

      {/* ── Revenue Trend (Area chart) ── */}
      <Card className="shadow-md border-0">
        <CardHeader className="pb-3 md:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                Revenue Trend
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">Sales, purchases & profit over the selected period</CardDescription>
            </div>
            <div className="flex items-center gap-2 md:gap-3 text-xs flex-wrap">
              <span className="flex items-center gap-1"><span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-indigo-500 inline-block" />Sales</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-red-400 inline-block" />Purchases</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-emerald-500 inline-block" />Profit</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 md:py-16 text-muted-foreground gap-3">
              <Calendar className="h-10 w-10 md:h-12 md:w-12 opacity-40" />
              <p className="text-xs md:text-sm">No data available for the selected period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ top: 5, right: 4, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="purchasesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={40} />
                <YAxis tickFormatter={formatCurrencyShort} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={48} />
                <Tooltip content={<CustomAreaTooltip />} />
                <Area type="monotone" dataKey="Sales" stroke="#6366f1" strokeWidth={2} fill="url(#salesGrad)" dot={false} />
                <Area type="monotone" dataKey="Purchases" stroke="#f87171" strokeWidth={2} fill="url(#purchasesGrad)" dot={false} />
                <Area type="monotone" dataKey="Profit" stroke="#22c55e" strokeWidth={2} fill="url(#profitGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Top Items bar + Payment modes pie ── */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2">
        {/* Top Selling Items — Bar chart */}
        <Card className="shadow-md border-0">
          <CardHeader className="pb-3 md:pb-4">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Package className="h-4 w-4 md:h-5 md:w-5 text-amber-500" />
              Top Selling Items
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">Best performing products by revenue</CardDescription>
          </CardHeader>
          <CardContent>
            {barData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 md:py-12 text-muted-foreground gap-3">
                <Package className="h-8 w-8 md:h-10 md:w-10 opacity-40" />
                <p className="text-xs md:text-sm">No sales data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 5, right: 4, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={false} />
                  <XAxis dataKey="name" tick={<CustomBarTick />} axisLine={false} tickLine={false} interval={0} />
                  <YAxis tickFormatter={formatCurrencyShort} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip
                    content={(props) => {
                      if (!props.active || !props.payload?.length) return null
                      const entry = props.payload[0]
                      return (
                        <div className="rounded-xl border bg-background/95 backdrop-blur-sm shadow-xl p-3 text-sm">
                          <p className="font-semibold mb-1">{props.label}</p>
                          <p>{formatCurrency(Number(entry.value ?? 0))}</p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="Revenue" radius={[6, 6, 0, 0]} activeBar={false}>
                    {barData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Payment Modes — Pie / Donut chart */}
        <Card className="shadow-md border-0">
          <CardHeader className="pb-3 md:pb-4">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Wallet className="h-4 w-4 md:h-5 md:w-5 text-indigo-500" />
              Payment Modes
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">Distribution by payment method</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 md:py-12 text-muted-foreground gap-3">
                <DollarSign className="h-8 w-8 md:h-10 md:w-10 opacity-40" />
                <p className="text-xs md:text-sm">No payment data available</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 md:gap-4">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={PIE_COLORS[entry.name] ?? COLORS[index % COLORS.length]}
                          stroke="transparent"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-full grid grid-cols-2 gap-x-4 gap-y-2">
                  {pieData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: PIE_COLORS[entry.name] ?? COLORS[index % COLORS.length] }}
                      />
                      <span className="text-xs capitalize truncate flex-1">{entry.name.replace(/_/g, " ")}</span>
                      <span className="text-xs font-semibold text-muted-foreground shrink-0">{entry.percentage.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Top Customers & Suppliers ── */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2">
        {/* Top Customers */}
        <Card className="shadow-md border-0">
          <CardHeader className="pb-3 md:pb-4">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Users className="h-4 w-4 md:h-5 md:w-5 text-emerald-500" />
              Top Customers
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">Highest revenue customers</CardDescription>
          </CardHeader>
          <CardContent>
            {top_customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 md:py-10 text-muted-foreground gap-3">
                <Users className="h-8 w-8 md:h-10 md:w-10 opacity-40" />
                <p className="text-xs md:text-sm">No customer data available</p>
              </div>
            ) : (
              <div className="space-y-2">
                {top_customers.map((customer, index) => {
                  const pct = (customer.total_amount / (top_customers[0].total_amount || 1)) * 100
                  return (
                    <div
                      key={customer.id}
                      className="group flex items-center gap-3 p-3 rounded-xl hover:bg-accent/60 cursor-pointer transition-all"
                      onClick={() => router.push(`/parties/${customer.id}`)}
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-sm shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{customer.name}</p>
                          <p className="text-sm font-bold ml-2 shrink-0">{formatCurrencyShort(customer.total_amount)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">{customer.invoice_count} inv</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Suppliers */}
        <Card className="shadow-md border-0">
          <CardHeader className="pb-3 md:pb-4">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Package className="h-4 w-4 md:h-5 md:w-5 text-rose-500" />
              Top Suppliers
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">Highest purchase suppliers</CardDescription>
          </CardHeader>
          <CardContent>
            {top_suppliers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 md:py-10 text-muted-foreground gap-3">
                <Users className="h-8 w-8 md:h-10 md:w-10 opacity-40" />
                <p className="text-xs md:text-sm">No supplier data available</p>
              </div>
            ) : (
              <div className="space-y-2">
                {top_suppliers.map((supplier, index) => {
                  const pct = (supplier.total_amount / (top_suppliers[0].total_amount || 1)) * 100
                  return (
                    <div
                      key={supplier.id}
                      className="group flex items-center gap-3 p-3 rounded-xl hover:bg-accent/60 cursor-pointer transition-all"
                      onClick={() => router.push(`/parties/${supplier.id}`)}
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-sm shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{supplier.name}</p>
                          <p className="text-sm font-bold ml-2 shrink-0">{formatCurrencyShort(supplier.total_amount)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-rose-500 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">{supplier.invoice_count} inv</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
