import * as React from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Share, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  AlertCircle,
  CircleDollarSign,
  FileText,
  Link2,
  Mail,
  MoreHorizontal,
  Package2,
  PencilLine,
  Share2,
  PlusCircle,
  Download,
  ReceiptText,
  ScrollText,
  UserRound,
} from "lucide-react-native";

import { SubpageHeader } from "@/components/subpage-header";
import { DevCacheIndicator } from "@/components/dev-cache-indicator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { ToastBanner, useTimedToast } from "@/components/ui/toast-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { CACHE_TTL_MS, formatCacheAge, isCacheStale } from "@/lib/cache-policy";
import { formatCurrency, formatShortDate } from "@/lib/formatters";
import { savePdfFile } from "@/lib/report-export";
import { invoiceService } from "@/services/invoice.service";
import { useAuthStore } from "@/store/auth-store";
import { useInvoiceStore } from "@/store/invoice-store";

export default function InvoiceDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { session } = useAuthStore();
  const cancelInvoice = useInvoiceStore((state) => state.cancelInvoice);
  const ensureInvoiceDetail = useInvoiceStore((state) => state.ensureInvoiceDetail);
  const { message, showToast } = useTimedToast();
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isCancelOpen, setIsCancelOpen] = React.useState(false);
  const [isEmailOpen, setIsEmailOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");
  const [recipientEmail, setRecipientEmail] = React.useState("");
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [isSharing, setIsSharing] = React.useState(false);
  const [isSendingEmail, setIsSendingEmail] = React.useState(false);
  const hasFocusedOnceRef = React.useRef(false);

  const invoiceId = typeof params.id === "string" ? params.id : "";
  const invoice = useInvoiceStore((state) => (invoiceId ? state.detailById[invoiceId] ?? null : null));
  const detailError = useInvoiceStore((state) => (invoiceId ? state.detailErrorById[invoiceId] ?? null : null));
  const detailStatus = useInvoiceStore((state) => (invoiceId ? state.detailStatusById[invoiceId] ?? 'idle' : 'idle'));
  const detailUpdatedAt = useInvoiceStore((state) => (invoiceId ? state.detailUpdatedAtById[invoiceId] ?? null : null));
  const invoiceCacheState =
    detailStatus === "loading"
      ? "refreshing"
      : invoice
        ? isCacheStale(detailUpdatedAt, CACHE_TTL_MS.invoiceDetail)
          ? "stale"
          : "cached"
        : "empty";

  const loadInvoice = React.useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (!session?.business_id || !invoiceId) {
      setError("Invoice details are unavailable.");
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    if (mode === "initial") {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
      try {
        setError(null);
        const nextInvoice = await ensureInvoiceDetail(session.business_id, invoiceId, mode === "refresh");
        setRecipientEmail(nextInvoice.party_email ?? "");
      } catch (loadError: any) {
      setError(
        loadError?.response?.data?.error?.message ??
          loadError?.response?.data?.message ??
          loadError?.message ??
          "Unable to load invoice details.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [ensureInvoiceDetail, invoiceId, session?.business_id]);

  React.useEffect(() => {
    void loadInvoice();
  }, [loadInvoice]);

  useFocusEffect(
    React.useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }

      void loadInvoice("refresh");
    }, [loadInvoice]),
  );

  async function onCancel() {
    if (!session?.business_id || !invoice) {
      return;
    }

    setIsCancelling(true);
    try {
      await cancelInvoice(session.business_id, invoice.id, {
        cancel_reason: normalizeOptional(cancelReason),
      });
      router.replace({
        pathname: "/(app)/invoices",
        params: {
          refresh: String(Date.now()),
          toast: `${invoice.invoice_number} cancelled.`,
        },
      });
    } catch (cancelError: any) {
      setError(
        cancelError?.response?.data?.error?.message ??
          cancelError?.response?.data?.message ??
          cancelError?.message ??
          "Unable to cancel the invoice.",
      );
    } finally {
      setIsCancelling(false);
      setIsCancelOpen(false);
    }
  }

  async function onDownloadPdf() {
    if (!session?.business_id || !invoice) {
      return;
    }

    setIsDownloading(true);
    try {
      const shareLink = await invoiceService.createInvoiceShareLink(session.business_id, invoice.id);
      const pdfUrl = invoiceService.buildPublicInvoicePdfUrl(shareLink.share_url, invoice.id);
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error("Unable to download invoice PDF.");
      }

      const bytes = await response.arrayBuffer();
      await savePdfFile({
        baseName: invoice.invoice_number,
        bytes,
      });
      showToast("Invoice PDF saved.");
    } catch (downloadError: any) {
      setError(
        downloadError?.response?.data?.error?.message ??
          downloadError?.response?.data?.message ??
          downloadError?.message ??
          "Unable to save invoice PDF.",
      );
    } finally {
      setIsDownloading(false);
    }
  }

  async function onShareInvoice() {
    if (!session?.business_id || !invoice) {
      return;
    }

    setIsSharing(true);
    try {
      const shareLink = await invoiceService.createInvoiceShareLink(session.business_id, invoice.id);
      await Share.share({
        message: `${invoice.invoice_number} from ${invoice.party_name}\n${shareLink.share_url}`,
        title: invoice.invoice_number,
        url: shareLink.share_url,
      });
    } catch (shareError: any) {
      setError(
        shareError?.response?.data?.error?.message ??
          shareError?.response?.data?.message ??
          shareError?.message ??
          "Unable to share the invoice.",
      );
    } finally {
      setIsSharing(false);
    }
  }

  async function onSendEmail() {
    if (!session?.business_id || !invoice) {
      return;
    }

    if (!recipientEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail.trim())) {
      setError("Enter a valid recipient email address.");
      return;
    }

    setIsSendingEmail(true);
    setError(null);
    try {
      await invoiceService.sendInvoiceEmail(session.business_id, invoice.id, recipientEmail.trim());
      setIsEmailOpen(false);
      showToast("Invoice emailed successfully.");
    } catch (emailError: any) {
      setError(
        emailError?.response?.data?.error?.message ??
          emailError?.response?.data?.message ??
          emailError?.message ??
          "Unable to send invoice email.",
      );
    } finally {
      setIsSendingEmail(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-6 pb-28 pt-4"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadInvoice("refresh")} />}>
        <View className="gap-6">
          <SubpageHeader
            backHref="/(app)/invoices"
            eyebrow="Invoice"
            subtitle="Review invoice amounts, line items, and billing status before taking follow-up actions."
            title={invoice?.invoice_number ?? "Invoice details"}
          />
          <DevCacheIndicator
            label="invoice"
            state={invoiceCacheState}
            detail={formatCacheAge(detailUpdatedAt)}
          />

          {isLoading ? <InvoiceDetailSkeleton /> : null}

          {(error || detailError) && !isLoading ? (
            <Card className="rounded-[28px] border-destructive/20 bg-destructive/5">
              <CardContent className="gap-4 px-5 py-5">
                <Text className="font-semibold text-foreground">Invoice details unavailable</Text>
                <Text className="text-sm leading-6 text-muted-foreground">{error ?? detailError}</Text>
                <Button className="h-12 rounded-2xl" onPress={() => void loadInvoice()}>
                  <Text>Retry</Text>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {invoice && !isLoading ? (
            <>
              <Card className="rounded-[28px]">
                <CardHeader>
                  <CardTitle>Invoice summary</CardTitle>
                  <CardDescription>Current total, balance due, and lifecycle state.</CardDescription>
                </CardHeader>
                <CardContent className="gap-4">
                  <SummaryRow icon={CircleDollarSign} label="Grand total" value={formatCurrency(invoice.grand_total)} />
                  <SummaryRow icon={ReceiptText} label="Amount paid" value={formatCurrency(invoice.amount_paid)} />
                  <SummaryRow icon={AlertCircle} label="Balance due" value={formatCurrency(invoice.balance_due)} />
                  <SummaryRow icon={FileText} label="Payment status" value={formatPaymentStatus(invoice.payment_status)} />
                </CardContent>
              </Card>

              <Card className="rounded-[28px]">
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                  <CardDescription>Use the fastest next step for this invoice from one place.</CardDescription>
                </CardHeader>
                <CardContent className="gap-4">
                  {!invoice.is_cancelled ? (
                    <ActionTile
                      description="Apply a payment and update the outstanding balance."
                      icon={CircleDollarSign}
                      label="Record payment"
                      layout="full"
                      onPress={() =>
                        router.push({
                          pathname: "/(app)/payment-record",
                          params: { invoice_id: invoice.id },
                        })
                      }
                      tone="primary"
                    />
                  ) : null}

                  {(invoice.invoice_type === "sales" || invoice.invoice_type === "purchase") && !invoice.is_cancelled ? (
                    <View className="gap-3">
                      <Text className="text-xs uppercase tracking-[1.2px] text-muted-foreground">Manage invoice</Text>
                      <View className="flex-row flex-wrap justify-between gap-y-3">
                        <ActionTile
                          description="Create a revised version from this invoice."
                          icon={PencilLine}
                          label="Revise"
                          onPress={() =>
                            router.push({
                              pathname:
                                invoice.invoice_type === "sales"
                                  ? "/(app)/invoice-create-sales"
                                  : "/(app)/invoice-create-purchase",
                              params: {
                                mode: "revise",
                                source_invoice_id: invoice.id,
                              },
                            })
                          }
                        />
                        <ActionTile
                          description="Save the invoice PDF into your selected device folder."
                          icon={Download}
                          label={isDownloading ? "Saving PDF..." : "Save PDF"}
                          onPress={onDownloadPdf}
                          disabled={isDownloading}
                          loading={isDownloading}
                        />
                        <ActionTile
                          description="Share a live invoice link."
                          icon={Share2}
                          label={isSharing ? "Sharing..." : "Share"}
                          onPress={onShareInvoice}
                          disabled={isSharing}
                          loading={isSharing}
                        />
                        <ActionTile
                          description="Send the invoice to the saved recipient email."
                          icon={Mail}
                          label="Email"
                          onPress={() => setIsEmailOpen(true)}
                        />
                      </View>
                    </View>
                  ) : null}

                  {(invoice.invoice_type === "sales" || invoice.invoice_type === "purchase") && !invoice.is_cancelled ? (
                    <View className="gap-3">
                      <Text className="text-xs uppercase tracking-[1.2px] text-muted-foreground">Follow-up notes</Text>
                      <View className="flex-row flex-wrap justify-between gap-y-3">
                        <ActionTile
                          description="Issue a credit note linked to this invoice."
                          icon={PlusCircle}
                          label="Credit note"
                          onPress={() =>
                            router.push({
                              pathname:
                                invoice.invoice_type === "sales"
                                  ? "/(app)/invoice-create-sales"
                                  : "/(app)/invoice-create-purchase",
                              params: {
                                invoice_id: invoice.id,
                                note_type: "credit_note",
                              },
                            })
                          }
                        />
                        <ActionTile
                          description="Issue a debit note linked to this invoice."
                          icon={PlusCircle}
                          label="Debit note"
                          onPress={() =>
                            router.push({
                              pathname:
                                invoice.invoice_type === "sales"
                                  ? "/(app)/invoice-create-sales"
                                  : "/(app)/invoice-create-purchase",
                              params: {
                                invoice_id: invoice.id,
                                note_type: "debit_note",
                              },
                            })
                          }
                        />
                      </View>
                    </View>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="rounded-[28px]">
                <CardHeader>
                  <CardTitle>Billing info</CardTitle>
                  <CardDescription>Party, dates, and tax setup for this invoice.</CardDescription>
                </CardHeader>
                <CardContent className="gap-3">
                  <DetailRow icon={UserRound} label="Party" value={invoice.party_name?.trim() || "Party details unavailable"} />
                  <DetailRow icon={ScrollText} label="Invoice date" value={formatShortDate(invoice.invoice_date)} />
                  <DetailRow icon={ScrollText} label="Due date" value={invoice.due_date ? formatShortDate(invoice.due_date) : "Not set"} />
                  <DetailRow icon={ReceiptText} label="Invoice type" value={formatInvoiceType(invoice.invoice_type)} />
                  <DetailRow icon={ReceiptText} label="Place of supply" value={invoice.place_of_supply || "Not set"} />
                </CardContent>
              </Card>

              {invoice.reference_invoice || invoice.revised_invoice || invoice.referencing_invoices?.length || invoice.payments?.length || invoice.cancel_reason ? (
                <Card className="rounded-[28px]">
                  <CardHeader>
                    <CardTitle>Invoice history</CardTitle>
                    <CardDescription>Reference links, notes, revisions, payments, and other invoice events.</CardDescription>
                  </CardHeader>
                  <CardContent className="gap-3">
                    {invoice.reference_invoice ? (
                      <TimelineRow
                        icon={Link2}
                        label="Created from reference invoice"
                        value={`${invoice.reference_invoice.invoice_number} (${formatInvoiceType(invoice.reference_invoice.invoice_type)})${invoice.reference_invoice.is_cancelled ? " | Cancelled" : ""}`}
                        onPress={() =>
                          router.push({
                            pathname: "/(app)/invoice-detail",
                            params: { id: invoice.reference_invoice?.id ?? "" },
                          })
                        }
                      />
                    ) : null}
                    {invoice.revised_invoice ? (
                      <TimelineRow
                        icon={PencilLine}
                        label="Latest revised invoice"
                        value={`${invoice.revised_invoice.invoice_number} (${formatInvoiceType(invoice.revised_invoice.invoice_type)})${invoice.revised_invoice.is_cancelled ? " | Cancelled" : ""}`}
                        onPress={() =>
                          router.push({
                            pathname: "/(app)/invoice-detail",
                            params: { id: invoice.revised_invoice?.id ?? "" },
                          })
                        }
                      />
                    ) : null}
                    {invoice.referencing_invoices?.map((linkedInvoice) => (
                      <TimelineRow
                        key={linkedInvoice.id}
                        icon={linkedInvoice.invoice_type === "credit_note" || linkedInvoice.invoice_type === "debit_note" ? PlusCircle : PencilLine}
                        label={linkedInvoice.invoice_type === "credit_note" || linkedInvoice.invoice_type === "debit_note" ? "Linked note" : "Revision created"}
                        value={`${linkedInvoice.invoice_number} (${formatInvoiceType(linkedInvoice.invoice_type)})${linkedInvoice.is_cancelled ? " | Cancelled" : ""}`}
                        meta={formatShortDate(linkedInvoice.created_at)}
                        onPress={() =>
                          router.push({
                            pathname: "/(app)/invoice-detail",
                            params: { id: linkedInvoice.id },
                          })
                        }
                      />
                    ))}
                    {invoice.payments?.map((payment) => (
                      <TimelineRow
                        key={payment.id}
                        icon={CircleDollarSign}
                        label={`Payment ${payment.payment_type === "received" ? "received" : "made"}`}
                        value={`${formatCurrency(payment.allocated_amount)} via ${formatPaymentMode(payment.payment_mode)}`}
                        meta={`${formatShortDate(payment.payment_date)}${payment.bank_ref_no ? ` | Ref ${payment.bank_ref_no}` : ""}${payment.is_reconciled ? " | Reconciled" : ""}`}
                        onPress={() =>
                          router.push({
                            pathname: "/(app)/payment-detail",
                            params: { id: payment.id },
                          })
                        }
                      />
                    ))}
                    {invoice.cancel_reason ? (
                      <TimelineRow
                        icon={AlertCircle}
                        label="Invoice cancelled"
                        value={invoice.cancel_reason}
                        meta={invoice.cancelled_at ? formatShortDate(invoice.cancelled_at) : undefined}
                      />
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}

              <Card className="rounded-[28px]">
                <CardHeader>
                  <CardTitle>Line items</CardTitle>
                  <CardDescription>{invoice.items.length} item(s) billed on this invoice.</CardDescription>
                </CardHeader>
                <CardContent className="gap-3">
                  {invoice.items.map((item) => (
                    <View key={item.id} className="rounded-[24px] border border-border/70 bg-background px-4 py-4">
                      <View className="flex-row items-start gap-4">
                        <View className="rounded-2xl bg-primary/10 px-3 py-3">
                          <Icon as={Package2} className="text-primary" size={18} />
                        </View>
                        <View className="flex-1 gap-1">
                          <View className="flex-row items-start justify-between gap-4">
                            <Text className="flex-1 font-semibold text-foreground">{item.item_name}</Text>
                            <Text className="font-semibold text-foreground">{formatCurrency(item.total_amount)}</Text>
                          </View>
                          <Text className="text-sm leading-5 text-muted-foreground">
                            {item.quantity} {item.unit} x {formatCurrency(item.unit_price)}
                          </Text>
                          <Text className="text-xs uppercase tracking-[1px] text-muted-foreground">
                            GST {item.gst_rate}% {item.hsn_code ? `| HSN ${item.hsn_code}` : ""}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </CardContent>
              </Card>

              <Card className="rounded-[28px]">
                <CardHeader>
                  <CardTitle>Tax and totals</CardTitle>
                  <CardDescription>Breakdown of taxable value, taxes, and rounding.</CardDescription>
                </CardHeader>
                <CardContent className="gap-3">
                  <SummaryRow icon={ReceiptText} label="Subtotal" value={formatCurrency(invoice.subtotal)} />
                  <SummaryRow icon={ReceiptText} label="Taxable amount" value={formatCurrency(invoice.taxable_amount)} />
                  <SummaryRow icon={ReceiptText} label="Total tax" value={formatCurrency(invoice.total_tax)} />
                  <SummaryRow icon={ReceiptText} label="Round off" value={formatCurrency(invoice.round_off)} />
                </CardContent>
              </Card>

              {invoice.notes ? (
                <Card className="rounded-[28px]">
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                    <CardDescription>Additional billing notes saved on the invoice.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Text className="text-sm leading-6 text-muted-foreground">{invoice.notes}</Text>
                  </CardContent>
                </Card>
              ) : null}

              {!invoice.is_cancelled ? (
                <Button className="mb-4 h-14 rounded-[24px]" variant="destructive" disabled={isCancelling} onPress={() => setIsCancelOpen(true)}>
                  {isCancelling ? (
                    <>
                      <ActivityIndicator color="#ffffff" />
                      <Text className="text-base">Cancelling invoice...</Text>
                    </>
                  ) : (
                    <Text className="text-base">Cancel invoice</Text>
                  )}
                </Button>
              ) : null}
            </>
          ) : null}
        </View>
      </ScrollView>
      <AlertDialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <AlertDialogContent className="rounded-[28px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This keeps the invoice for history and marks it as cancelled for this business.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            className="min-h-[100px] rounded-[22px] border-border/70 bg-muted/35 px-4 py-3"
            placeholder="Reason for cancellation"
            value={cancelReason}
            onChangeText={setCancelReason}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Text>Back</Text>
            </AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onPress={onCancel}>
              <Text>Confirm cancel</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={isEmailOpen} onOpenChange={setIsEmailOpen}>
        <DialogContent className="max-w-[420px] rounded-[28px]">
          <DialogHeader>
            <DialogTitle>Email invoice</DialogTitle>
            <DialogDescription>Send this invoice PDF to the recipient email address.</DialogDescription>
          </DialogHeader>
          <View className="gap-4">
            <Input
              autoCapitalize="none"
              keyboardType="email-address"
              value={recipientEmail}
              onChangeText={setRecipientEmail}
              placeholder="Recipient email"
            />
            <Button className="h-14 rounded-[24px]" disabled={isSendingEmail} onPress={onSendEmail}>
              {isSendingEmail ? (
                <>
                  <ActivityIndicator color="#ffffff" />
                  <Text>Sending email...</Text>
                </>
              ) : (
                <>
                  <Icon as={Mail} className="text-primary-foreground" size={18} />
                  <Text>Send invoice</Text>
                </>
              )}
            </Button>
          </View>
        </DialogContent>
      </Dialog>
      <ToastBanner message={message} variant="success" />
    </SafeAreaView>
  );
}

function InvoiceDetailSkeleton() {
  return (
    <View className="gap-6">
      <Card className="rounded-[28px]">
        <CardHeader>
          <Skeleton className="h-6 w-40 rounded-full" />
          <Skeleton className="mt-2 h-4 w-64 rounded-full" />
        </CardHeader>
        <CardContent className="gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <View key={index} className="flex-row items-center gap-3 rounded-2xl border border-border/70 bg-background px-4 py-4">
              <Skeleton className="h-12 w-12 rounded-2xl" />
              <View className="flex-1 gap-2">
                <Skeleton className="h-4 w-28 rounded-full" />
                <Skeleton className="h-5 w-36 rounded-full" />
              </View>
            </View>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-[28px]">
        <CardHeader>
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="mt-2 h-4 w-72 rounded-full" />
        </CardHeader>
        <CardContent className="gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-[24px]" />
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-[28px]">
        <CardHeader>
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="mt-2 h-4 w-56 rounded-full" />
        </CardHeader>
        <CardContent className="gap-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-[24px]" />
          ))}
        </CardContent>
      </Card>
    </View>
  );
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: typeof CircleDollarSign;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-border/70 bg-background px-4 py-4">
      <View className="rounded-2xl bg-primary/10 px-3 py-3">
        <Icon as={icon} className="text-primary" size={18} />
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-sm text-muted-foreground">{label}</Text>
        <Text className="font-semibold text-foreground">{value}</Text>
      </View>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: typeof CircleDollarSign;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-border/70 bg-background px-4 py-4">
      <View className="rounded-2xl bg-primary/10 px-3 py-3">
        <Icon as={icon} className="text-primary" size={18} />
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-sm text-muted-foreground">{label}</Text>
        <Text className="font-semibold text-foreground">{value}</Text>
      </View>
    </View>
  );
}

function TimelineRow({
  icon,
  label,
  meta,
  onPress,
  value,
}: {
  icon: typeof CircleDollarSign;
  label: string;
  meta?: string;
  onPress?: () => void;
  value: string;
}) {
  const content = (
    <View className="flex-row items-start gap-3 rounded-2xl border border-border/70 bg-background px-4 py-4">
      <View className="rounded-2xl bg-primary/10 px-3 py-3">
        <Icon as={icon} className="text-primary" size={18} />
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-sm text-muted-foreground">{label}</Text>
        <Text className="font-semibold text-foreground">{value}</Text>
        {meta ? <Text className="text-xs uppercase tracking-[1px] text-muted-foreground">{meta}</Text> : null}
      </View>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return <Pressable onPress={onPress}>{content}</Pressable>;
}

function ActionTile({
  description,
  disabled,
  icon,
  label,
  layout = "half",
  loading = false,
  onPress,
  tone = "default",
}: {
  description: string;
  disabled?: boolean;
  icon: typeof CircleDollarSign;
  label: string;
  layout?: "full" | "half";
  loading?: boolean;
  onPress: () => void;
  tone?: "default" | "primary";
}) {
  const palette =
    tone === "primary"
      ? {
          card: "border-primary/25 bg-primary",
          iconWrap: "bg-primary-foreground/15",
          icon: "text-primary-foreground",
          text: "text-primary-foreground",
          subtext: "text-primary-foreground/80",
        }
      : {
          card: "border-border/70 bg-background",
          iconWrap: "bg-primary/10",
          icon: "text-primary",
          text: "text-foreground",
          subtext: "text-muted-foreground",
        };

  return (
    <Pressable
      accessibilityRole="button"
      className={`${layout === "full" ? "w-full" : "w-[48%]"} rounded-[24px] border px-4 py-4 ${palette.card} ${disabled ? "opacity-60" : ""}`}
      disabled={disabled}
      onPress={onPress}>
      <View className="gap-3">
        <View className={`w-11 rounded-2xl px-0 py-3 ${palette.iconWrap}`}>
          {loading ? (
            <ActivityIndicator color={tone === "primary" ? "#ffffff" : "#2563eb"} />
          ) : (
            <Icon as={icon} className={`mx-auto ${palette.icon}`} size={18} />
          )}
        </View>
        <View className="gap-1">
          <Text className={`font-semibold ${palette.text}`}>{label}</Text>
          <Text className={`text-sm leading-5 ${palette.subtext}`}>{description}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          {loading ? (
            <ActivityIndicator color={tone === "primary" ? "#ffffff" : "#2563eb"} size="small" />
          ) : (
            <Icon as={MoreHorizontal} className={palette.icon} size={16} />
          )}
          <Text className={`text-xs uppercase tracking-[1px] ${palette.subtext}`}>{loading ? "Working" : "Action"}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function formatInvoiceType(type: NonNullable<ReturnType<typeof useInvoiceStore.getState>["detailById"][string]>["invoice_type"]) {
  if (type === "credit_note") return "Credit note";
  if (type === "debit_note") return "Debit note";
  return type === "sales" ? "Sales" : "Purchase";
}

function formatPaymentStatus(status: NonNullable<ReturnType<typeof useInvoiceStore.getState>["detailById"][string]>["payment_status"]) {
  if (status === "partial") return "Partial";
  if (status === "overdue") return "Overdue";
  return status === "paid" ? "Paid" : "Unpaid";
}

function formatPaymentMode(mode: NonNullable<NonNullable<ReturnType<typeof useInvoiceStore.getState>["detailById"][string]>["payments"]>[number]["payment_mode"]) {
  if (mode === "bank_transfer") return "Bank transfer";
  return mode === "upi" ? "UPI" : mode.charAt(0).toUpperCase() + mode.slice(1);
}

function normalizeOptional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
