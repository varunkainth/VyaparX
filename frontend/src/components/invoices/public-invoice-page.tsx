"use client"

import { useEffect, useMemo, useState } from "react"
import type { PublicInvoicePayload } from "@/services/invoice.service"
import { API_BASE_URL } from "@/lib/env"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Download, FileText, ExternalLink } from "lucide-react"
import { useTheme } from "next-themes"

interface PublicInvoicePageProps {
  invoiceId: string
}

export function PublicInvoicePage({ invoiceId }: PublicInvoicePageProps) {
  const { resolvedTheme } = useTheme()
  const [data, setData] = useState<PublicInvoicePayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isTokenResolved, setIsTokenResolved] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    const searchParams = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""))
    const shareToken = searchParams.get("token") || hashParams.get("token")
    setToken(shareToken)
    setIsTokenResolved(true)
  }, [])

  useEffect(() => {
    if (!isTokenResolved) {
      return
    }

    if (!token) {
      setError("This share link is missing its access token.")
      setIsLoading(false)
      return
    }

    let isMounted = true

    const loadInvoice = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/public/invoices/${invoiceId}?token=${encodeURIComponent(token)}`, {
          cache: "no-store",
        })

        const payload = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(
            payload?.error?.message ||
            payload?.message ||
            "Unable to load this digital bill right now."
          )
        }

        if (isMounted) {
          setData(payload.data as PublicInvoicePayload)
        }
      } catch (error) {
        if (isMounted) {
          setError(error instanceof Error ? error.message : "Unable to load this digital bill right now.")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadInvoice()

    return () => {
      isMounted = false
    }
  }, [invoiceId, isTokenResolved, token])

  const totals = useMemo(() => {
    if (!data) return null
    return {
      totalBeforeRounding: data.invoice.grand_total - data.invoice.round_off,
      roundOff: data.invoice.round_off,
      finalTotal: data.invoice.grand_total,
    }
  }, [data])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount)

  const formatDate = (dateString: string) =>
    new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(dateString))

  const handleDownload = () => {
    if (!token) return
    void (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/public/invoices/${invoiceId}/pdf?token=${encodeURIComponent(token)}`, {
          cache: "no-store",
        })

        if (!response.ok) {
          throw new Error("Unable to download this digital bill right now.")
        }

        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `invoice-${invoiceId}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      } catch (downloadError) {
        setError(downloadError instanceof Error ? downloadError.message : "Unable to download this digital bill right now.")
      }
    })()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <Card>
            <CardContent className="flex min-h-[320px] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">Loading digital bill...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error || !data || !totals) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-lg font-semibold">Digital bill unavailable</p>
              <p className="mt-2 text-sm text-muted-foreground">{error || "Invoice not found."}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const { invoice, business, party } = data
  const invoicePartyName = String(invoice.party_name || "").trim().toUpperCase() || "PARTY DETAILS UNAVAILABLE"
  const businessPhone = typeof business?.phone === "string" ? business.phone : business?.phone ? String(business.phone) : ""
  const partyAddress = typeof party?.address === "string" ? party.address : party?.address ? String(party.address) : ""
  const partyPhone = typeof party?.phone === "string" ? party.phone : party?.phone ? String(party.phone) : ""
  const partyEmail = typeof party?.email === "string" ? party.email : party?.email ? String(party.email) : ""
  const businessLogo = typeof business?.logo_url === "string" ? business.logo_url : ""
  const isDark = resolvedTheme === "dark"

  return (
    <div
      className={`min-h-screen px-3 py-4 sm:px-4 sm:py-8 ${
        isDark
          ? "bg-[linear-gradient(180deg,#020617_0%,#111827_100%)] text-slate-50"
          : "bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] text-slate-950"
      }`}
    >
      <div className="mx-auto max-w-5xl space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card/90 p-4 text-card-foreground shadow-sm backdrop-blur sm:p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Digital Bill</Badge>
              {invoice.is_cancelled && <Badge variant="destructive">Cancelled</Badge>}
            </div>
            <div className="flex items-center gap-3">
              {businessLogo ? (
                <img
                  src={businessLogo}
                  alt={`${String(business?.name || "Business")} logo`}
                  className="h-12 w-12 rounded-2xl border border-border object-cover"
                />
              ) : null}
              <div>
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{String(business?.name || "Business")}</h1>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Invoice {invoice.invoice_number} • {formatDate(invoice.invoice_date)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <div className="sm:text-right">
              <p className="text-sm text-muted-foreground">Final Total</p>
              <p className="text-2xl font-bold text-primary sm:text-3xl">{formatCurrency(invoice.grand_total)}</p>
            </div>
            <Button onClick={handleDownload} className="cursor-pointer w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Bill From</p>
                  <p className="mt-2 font-semibold">{String(business?.name || "-")}</p>
                  <p className="text-sm text-muted-foreground">{String(business?.address_line1 || "")}</p>
                  <p className="text-sm text-muted-foreground">
                    {String(business?.city || "")} {String(business?.state || "")}
                  </p>
                  {businessPhone ? <p className="text-sm text-muted-foreground">{businessPhone}</p> : null}
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Bill To</p>
                  <p className="mt-2 font-semibold">{invoicePartyName}</p>
                  {partyAddress ? <p className="text-sm text-muted-foreground">{partyAddress}</p> : null}
                  {partyPhone ? <p className="text-sm text-muted-foreground">{partyPhone}</p> : null}
                  {partyEmail ? <p className="text-sm text-muted-foreground">{partyEmail}</p> : null}
                </div>
              </div>

              <Separator />

              <div className="space-y-3 md:hidden">
                {invoice.items.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-border bg-muted/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{item.item_name}</p>
                        <p className="text-xs text-muted-foreground">{item.quantity} {item.unit}</p>
                      </div>
                      <p className="text-sm font-semibold">{formatCurrency(item.total_amount)}</p>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                      <div>
                        <p>Rate</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{formatCurrency(item.unit_price)}</p>
                      </div>
                      <div>
                        <p>GST</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{item.gst_rate}%</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between rounded-2xl bg-primary/10 px-4 py-3 text-sm font-semibold">
                  <span>Final Total</span>
                  <span>{formatCurrency(invoice.grand_total)}</span>
                </div>
              </div>

              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">GST</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.item_name}</p>
                            <p className="text-xs text-muted-foreground">{item.unit}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell className="text-right">{item.gst_rate}%</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.total_amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={4} className="text-right">Final Total</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(invoice.grand_total)}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle>Totals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(invoice.total_tax)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Before Rounding</span>
                  <span>{formatCurrency(totals.totalBeforeRounding)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Round Off</span>
                  <span>{formatCurrency(totals.roundOff)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-semibold">
                  <span>Final Total</span>
                  <span>{formatCurrency(totals.finalTotal)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={handleDownload} className="w-full cursor-pointer">
                  <Download className="mr-2 h-4 w-4" />
                  Download Bill
                </Button>
                <Button
                  variant="outline"
                  className="w-full cursor-pointer"
                  onClick={() => window.open(window.location.href, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Share Link
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
