"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MobileTable, MobileTableRow } from "@/components/ui/mobile-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { reportService } from "@/services/report.service";
import { useBusinessStore } from "@/store/useBusinessStore";
import type { MonthlySalesReport } from "@/types/report";

export default function SalesReportPage() {
  const { currentBusiness } = useBusinessStore();
  const [reports, setReports] = useState<MonthlySalesReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetchReports = async () => {
    if (!currentBusiness?.id) return;
    
    try {
      setLoading(true);
      const data = await reportService.getMonthlySales(currentBusiness.id, {
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      });
      setReports(data);
    } catch (error) {
      console.error("Failed to fetch sales report:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [currentBusiness?.id]);

  const handleExport = async (format: "csv" | "excel") => {
    if (!currentBusiness?.id) return;
    
    try {
      const blob = await reportService.exportMonthlySales(
        currentBusiness.id,
        format,
        {
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
        }
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sales-report.${format === "excel" ? "xlsx" : "csv"}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to export report:", error);
    }
  };

  const totalSales = reports.reduce(
    (sum, r) => sum + parseFloat(r.grand_total),
    0
  );
  const totalTax = reports.reduce((sum, r) => sum + parseFloat(r.total_tax), 0);
  const totalInvoices = reports.reduce((sum, r) => sum + r.invoice_count, 0);

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
        <h1 className="text-2xl sm:text-3xl font-bold">Sales Report</h1>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalSales.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tax Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalTax.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvoices}</div>
          </CardContent>
        </Card>
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
              <Button onClick={fetchReports} className="cursor-pointer w-full sm:w-auto">
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Monthly Sales</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No sales data found
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Invoices</TableHead>
                      <TableHead className="text-right">Taxable Amount</TableHead>
                      <TableHead className="text-right">Tax</TableHead>
                      <TableHead className="text-right">Grand Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.month}>
                        <TableCell className="font-medium">
                          {new Date(report.month + "-01").toLocaleDateString(
                            "en-US",
                            { year: "numeric", month: "long" }
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {report.invoice_count}
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{parseFloat(report.taxable_amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{parseFloat(report.total_tax).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ₹{parseFloat(report.grand_total).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <MobileTable className="md:hidden">
                {reports.map((report) => (
                  <MobileTableRow key={report.month}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">
                          {new Date(report.month + "-01").toLocaleDateString(
                            "en-US",
                            { year: "numeric", month: "long" }
                          )}
                        </p>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                          {report.invoice_count} invoices
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                        <div>
                          <p className="text-xs text-muted-foreground">Taxable</p>
                          <p className="text-sm font-medium">
                            ₹{parseFloat(report.taxable_amount).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Tax</p>
                          <p className="text-sm font-medium">
                            ₹{parseFloat(report.total_tax).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground">Grand Total</p>
                        <p className="text-lg font-bold text-primary">
                          ₹{parseFloat(report.grand_total).toFixed(2)}
                        </p>
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
  );
}
