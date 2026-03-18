import { NextRequest } from "next/server"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params
  const token = request.nextUrl.searchParams.get("token")

  if (!token) {
    return new Response("Share token is required", { status: 400 })
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/public/invoices/${invoiceId}/pdf?token=${encodeURIComponent(token)}`,
    {
      cache: "no-store",
    }
  )

  const blob = await response.arrayBuffer()

  return new Response(blob, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "application/pdf",
      "Content-Disposition": response.headers.get("Content-Disposition") || "attachment; filename=\"invoice.pdf\"",
    },
  })
}
