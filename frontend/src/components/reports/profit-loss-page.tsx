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
import { reportService } from "@/services/report.service";
import { useBusinessStore } from "@/store/useBusinessStore";
import type { GstSummaryReport } from "@/types/report";

export default function ProfitLossPage() {
  const { currentBusiness } = useBusinessStore();
  const [salesReport, setSalesReport] = useState<GstSummaryReport | null>(null);
  const [purchaseReport, setPurchaseReport] = useState<GstSummaryReport | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetchReports = async () => {
    if (!currentBusiness?.id) return;
    
    try {
      setLoading(true);
      const [sales, purchase] = await Promise.all([
        reportService.getGstSummary(currentBusiness.id, {
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          invoice_type: "sales",
        }),
        reportService.getGstSummary(currentBusiness.id, {
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          invoice_type: "purchase",
        }),
      ]);
      setSalesReport(sales);
      setPurchaseReport(purchase);
    } catch (error) {
      console.error("Failed to fetch profit & loss report:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [currentBusiness?.id]);

  const salesTotal = salesReport
    ? parseFloat(salesReport.grand_total)
    : 0;
  const purchaseTotal = purchaseReport
    ? parseFloat(purchaseReport.grand_total)
    : 0;
  const grossProfit = salesTotal - purchaseTotal;
  const profitMargin = salesTotal > 0 ? (grossProfit / salesTotal) * 100 : 0;

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
        <h1 className="text-2xl sm:text-3xl font-bold">Profit & Loss Statement</h1>
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

      {loading ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">Loading...</div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Sales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ₹{salesTotal.toFixed(2)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Purchases
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  ₹{purchaseTotal.toFixed(2)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Gross Profit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    grossProfit >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  ₹{grossProfit.toFixed(2)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Profit Margin
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    profitMargin >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {profitMargin.toFixed(2)}%
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detailed Statement</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Particulars</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-green-50 dark:bg-green-950/20">
                    <TableCell className="font-semibold">Revenue</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Sales</TableCell>
                    <TableCell className="text-right">
                      ₹{salesTotal.toFixed(2)}
                    </TableCell>
                  </TableRow>
                  <TableRow className="font-medium">
                    <TableCell>Total Revenue</TableCell>
                    <TableCell className="text-right">
                      ₹{salesTotal.toFixed(2)}
                    </TableCell>
                  </TableRow>
                  <TableRow className="h-4"></TableRow>
                  <TableRow className="bg-red-50 dark:bg-red-950/20">
                    <TableCell className="font-semibold">
                      Cost of Goods Sold
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Purchases</TableCell>
                    <TableCell className="text-right">
                      ₹{purchaseTotal.toFixed(2)}
                    </TableCell>
                  </TableRow>
                  <TableRow className="font-medium">
                    <TableCell>Total COGS</TableCell>
                    <TableCell className="text-right">
                      ₹{purchaseTotal.toFixed(2)}
                    </TableCell>
                  </TableRow>
                  <TableRow className="h-4"></TableRow>
                  <TableRow className="bg-muted/50 font-bold text-lg">
                    <TableCell>Gross Profit</TableCell>
                    <TableCell
                      className={`text-right ${
                        grossProfit >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      ₹{grossProfit.toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
