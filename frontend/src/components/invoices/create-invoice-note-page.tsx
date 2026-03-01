"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { invoiceService } from "@/services/invoice.service";
import { useBusinessStore } from "@/store/useBusinessStore";
import type { InvoiceWithItems, NoteType, CreateInvoiceNoteInput } from "@/types/invoice";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-handler";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, FileText } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";

interface CreateInvoiceNotePageProps {
  invoiceId: string;
}

export function CreateInvoiceNotePage({ invoiceId }: CreateInvoiceNotePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentBusiness } = useBusinessStore();
  
  const [invoice, setInvoice] = useState<InvoiceWithItems | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noteType, setNoteType] = useState<NoteType>("credit_note");
  const [noteReason, setNoteReason] = useState("");

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!currentBusiness?.id) return;

      try {
        setIsLoading(true);
        const data = await invoiceService.getInvoice(currentBusiness.id, invoiceId);
        setInvoice(data);
        
        // Set note type from query param if provided
        const typeParam = searchParams.get("type");
        if (typeParam === "credit_note" || typeParam === "debit_note") {
          setNoteType(typeParam);
        }
      } catch (error) {
        toast.error(getErrorMessage(error));
        router.push("/invoices");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoice();
  }, [currentBusiness?.id, invoiceId, searchParams, router]);

  const handleSubmit = async () => {
    if (!currentBusiness?.id || !invoice) return;

    try {
      setIsSubmitting(true);

      // Calculate totals from items
      const subtotal = invoice.items.reduce((sum, item) => {
        const baseAmount = item.quantity * item.unit_price;
        const divisor = item.price_mode === "inclusive" ? 1 + item.gst_rate / 100 : 1;
        return sum + (baseAmount / divisor);
      }, 0);

      const taxableAmount = invoice.items.reduce((sum, item) => sum + item.taxable_value, 0);
      const totalTax = invoice.items.reduce(
        (sum, item) => sum + item.cgst_amount + item.sgst_amount + item.igst_amount,
        0
      );
      const grandTotal = invoice.items.reduce((sum, item) => sum + item.total_amount, 0);

      const noteData: any = {
        party_id: invoice.party_id,
        invoice_date: new Date().toISOString().split("T")[0],
        place_of_supply: invoice.place_of_supply,
        is_igst: invoice.is_igst,
        items: invoice.items.map((item) => ({
          item_id: item.item_id ? item.item_id : undefined,
          item_name: item.item_name,
          hsn_code: item.hsn_code ? item.hsn_code : undefined,
          unit: item.unit,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_pct: item.discount_pct,
          price_mode: item.price_mode,
          taxable_value: item.taxable_value,
          gst_rate: item.gst_rate,
          cgst_rate: item.cgst_rate,
          sgst_rate: item.sgst_rate,
          igst_rate: item.igst_rate,
          cgst_amount: item.cgst_amount,
          sgst_amount: item.sgst_amount,
          igst_amount: item.igst_amount,
          total_amount: item.total_amount,
        })),
        subtotal,
        taxable_amount: taxableAmount,
        total_tax: totalTax,
        grand_total: grandTotal,
        note_type: noteType,
        note_reason: noteReason || undefined,
      };

      const result = await invoiceService.createInvoiceNote(
        currentBusiness.id,
        invoiceId,
        noteData
      );

      toast.success(
        `${noteType === "credit_note" ? "Credit" : "Debit"} note created successfully`
      );
      router.push(`/invoices/${result.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentBusiness) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Please select a business</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading invoice...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Invoice not found</p>
      </div>
    );
  }

  if (invoice.invoice_type === "credit_note" || invoice.invoice_type === "debit_note") {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Cannot create notes for credit/debit notes</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              Create {noteType === "credit_note" ? "Credit" : "Debit"} Note
            </h1>
            <p className="text-muted-foreground">
              For invoice {invoice.invoice_number}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Note Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="note_type">Note Type</Label>
                <Select
                  value={noteType}
                  onValueChange={(value: NoteType) => setNoteType(value)}
                >
                  <SelectTrigger id="note_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit_note">Credit Note</SelectItem>
                    <SelectItem value="debit_note">Debit Note</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  {noteType === "credit_note"
                    ? "Credit note reduces the amount owed by the customer (for returns/refunds)"
                    : "Debit note increases the amount owed by the customer (for additional charges)"}
                </p>
              </div>

              <div>
                <Label htmlFor="note_reason">Reason (Optional)</Label>
                <Textarea
                  id="note_reason"
                  value={noteReason}
                  onChange={(e) => setNoteReason(e.target.value)}
                  placeholder="Enter reason for this note..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
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
                          {item.hsn_code && (
                            <p className="text-sm text-muted-foreground">
                              HSN: {item.hsn_code}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity} {item.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{item.unit_price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">{item.gst_rate}%</TableCell>
                      <TableCell className="text-right">
                        ₹{item.total_amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4} className="text-right font-medium">
                      Grand Total
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      ₹{invoice.grand_total.toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Original Invoice</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Invoice Number</p>
                <p className="font-medium">{invoice.invoice_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Party</p>
                <p className="font-medium">{invoice.party_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Invoice Date</p>
                <p className="font-medium">
                  {new Date(invoice.invoice_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="font-medium">₹{invoice.grand_total.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full cursor-pointer"
            size="lg"
          >
            <FileText className="h-5 w-5 mr-2" />
            {isSubmitting
              ? "Creating..."
              : `Create ${noteType === "credit_note" ? "Credit" : "Debit"} Note`}
          </Button>
        </div>
      </div>
    </div>
  );
}
