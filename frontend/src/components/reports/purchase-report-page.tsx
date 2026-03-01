"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { reportService } from "@/services/report.service";
import { useBusinessStore } from "@/store/useBusinessStore";
import type { GstSummaryReport } from "@/types/report";

export default function PurchaseReportPage() {
  const { currentBusiness } = useBusinessStore();
  const [report, setReport] = useState<GstSummaryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetchReport = async () => {
    if (!currentBusiness?.id) return;
    
    try {
      setLoading(true);
      const data = await reportService.getGstSummary(currentBusiness.id, {
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        invoice_type: "purchase",
      });
      setReport(data);
    } catch (error) {
      console.error("Failed to fetch purchase report:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [currentBusiness?.id]);

  const handleExport = async (format: "csv" | "excel") => {
    if (!currentBusiness?.id) return;
    
    try {
      const blob = await reportService.exportGstSummary(
        currentBusiness.id,
        format,
        {
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          invoice_type: "purchase",
        }
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `purchase-report.${format === "excel" ? "xlsx" : "csv"}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to export report:", error);
    }
  };

  if (!currentBusiness) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Please select a business</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Purchase Report</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="cursor-pointer w-full sm:w-auto">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => handleExport("csv")}
              className="cursor-pointer"
            >
              <FileText className="h-4 w-4 mr-2" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleExport("excel")}
              className="cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export as Excel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="from_date">From Date</Label>
              <Input
                id="from_date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="to_date">To Date</Label>
              <Input
                id="to_date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchReport} className="cursor-pointer w-full sm:w-auto">
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">Loading...</div>
          </CardContent>
        </Card>
      ) : !report ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              No purchase data found
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Purchases
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₹{parseFloat(report.grand_total).toFixed(2)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Tax Paid
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₹{parseFloat(report.total_tax).toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Purchase Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Taxable Amount</span>
                  <span className="font-medium">
                    ₹{parseFloat(report.taxable_amount).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">CGST</span>
                  <span className="font-medium">
                    ₹{parseFloat(report.cgst_amount).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">SGST</span>
                  <span className="font-medium">
                    ₹{parseFloat(report.sgst_amount).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">IGST</span>
                  <span className="font-medium">
                    ₹{parseFloat(report.igst_amount).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Total Tax</span>
                  <span className="font-medium">
                    ₹{parseFloat(report.total_tax).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-3 bg-muted/50 px-4 rounded-md">
                  <span className="font-semibold">Grand Total</span>
                  <span className="font-bold text-lg">
                    ₹{parseFloat(report.grand_total).toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
