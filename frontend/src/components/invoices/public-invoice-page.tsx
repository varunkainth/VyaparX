"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { invoiceService, type PublicInvoicePayload } from "@/services/invoice.service"
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

interface PublicInvoicePageProps {
  invoiceId: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000"

export function PublicInvoicePage({ invoiceId }: PublicInvoicePageProps) {
  const searchParams = useSearchParams()
  const [data, setData] = useState<PublicInvoicePayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const token = searchParams.get("token")

  useEffect(() => {
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
        const response = await invoiceService.getPublicInvoice(invoiceId, token)
        if (isMounted) {
          setData(response)
        }
      } catch {
        if (isMounted) {
          setError("This digital bill link is invalid or has expired.")
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
  }, [invoiceId, token])

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
    window.open(
      `${API_BASE_URL}/api/v1/public/invoices/${invoiceId}/pdf?token=${encodeURIComponent(token)}`,
      "_blank",
      "noopener,noreferrer"
    )
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
  const businessPhone = typeof business?.phone === "string" ? business.phone : business?.phone ? String(business.phone) : ""
  const partyAddress = typeof party?.address === "string" ? party.address : party?.address ? String(party.address) : ""
  const partyPhone = typeof party?.phone === "string" ? party.phone : party?.phone ? String(party.phone) : ""
  const partyEmail = typeof party?.email === "string" ? party.email : party?.email ? String(party.email) : ""

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border bg-white/90 p-6 shadow-sm backdrop-blur sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Digital Bill</Badge>
              {invoice.is_cancelled && <Badge variant="destructive">Cancelled</Badge>}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{String(business?.name || "Business")}</h1>
            <p className="text-sm text-muted-foreground">
              Invoice {invoice.invoice_number} • {formatDate(invoice.invoice_date)}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Final Total</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(invoice.grand_total)}</p>
            </div>
            <Button onClick={handleDownload} className="cursor-pointer">
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <Card className="border-0 shadow-sm">
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
                  <p className="mt-2 font-semibold">{invoice.party_name}</p>
                  {partyAddress ? <p className="text-sm text-muted-foreground">{partyAddress}</p> : null}
                  {partyPhone ? <p className="text-sm text-muted-foreground">{partyPhone}</p> : null}
                  {partyEmail ? <p className="text-sm text-muted-foreground">{partyEmail}</p> : null}
                </div>
              </div>

              <Separator />

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
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-0 shadow-sm">
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

            <Card className="border-0 shadow-sm">
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
