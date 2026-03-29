import * as React from "react";
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Download, FileText, MapPin, Phone, Store, UserRound } from "lucide-react-native";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { formatCurrency, formatShortDate } from "@/lib/formatters";
import { invoiceService } from "@/services/invoice.service";
import type { InvoiceWithItems } from "@/types/invoice";

type PublicInvoicePayload = {
  invoice: InvoiceWithItems;
  business: Record<string, unknown> | null;
  party: Record<string, unknown> | null;
  invoice_settings: Record<string, unknown> | null;
};

export default function PublicInvoiceScreen() {
  const params = useLocalSearchParams<{ id?: string; token?: string }>();
  const invoiceId = typeof params.id === "string" ? params.id : "";
  const token = typeof params.token === "string" ? params.token : "";
  const [data, setData] = React.useState<PublicInvoicePayload | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const loadInvoice = React.useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!invoiceId || !token) {
        setError("This digital bill link is incomplete.");
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
        const nextData = await invoiceService.getPublicInvoice(invoiceId, token);
        setData(nextData);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load this digital bill right now.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [invoiceId, token],
  );

  React.useEffect(() => {
    void loadInvoice();
  }, [loadInvoice]);

  const businessName = String(data?.business?.name ?? "Business");
  const partyName = String(data?.invoice.party_name ?? "").trim().toUpperCase() || "PARTY DETAILS UNAVAILABLE";
  const partyPhone = String(data?.party?.phone ?? "").trim();
  const partyAddress = String(data?.party?.address ?? "").trim();

  async function onOpenPdf() {
    if (!invoiceId || !token) {
      return;
    }

    const pdfUrl = invoiceService.buildPublicInvoicePdfUrlFromToken(invoiceId, token);
    await Linking.openURL(pdfUrl);
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-6 pb-16 pt-4"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadInvoice("refresh")} />}>
        <View className="gap-6">
          <View className="gap-2">
            <Text className="text-sm uppercase tracking-[2px] text-muted-foreground">Digital bill</Text>
            <Text className="text-3xl font-extrabold tracking-tight text-foreground">
              {data?.invoice.invoice_number ?? "Invoice"}
            </Text>
            <Text className="text-base leading-6 text-muted-foreground">
              Opened inside VyaparX using the shared invoice link.
            </Text>
          </View>

          {isLoading ? (
            <Card className="rounded-[28px]">
              <CardContent className="items-center gap-4 px-5 py-10">
                <ActivityIndicator size="large" />
                <Text className="text-sm text-muted-foreground">Loading digital bill...</Text>
              </CardContent>
            </Card>
          ) : null}

          {!isLoading && error ? (
            <Card className="rounded-[28px] border-destructive/20 bg-destructive/5">
              <CardContent className="gap-4 px-5 py-5">
                <Text className="font-semibold text-foreground">Digital bill unavailable</Text>
                <Text className="text-sm leading-6 text-muted-foreground">{error}</Text>
                <Button className="h-12 rounded-2xl" onPress={() => void loadInvoice()}>
                  <Text>Retry</Text>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {!isLoading && data ? (
            <>
              <Card className="rounded-[28px]">
                <CardHeader>
                  <CardTitle>{businessName}</CardTitle>
                  <CardDescription>
                    Invoice date {formatShortDate(data.invoice.invoice_date)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="gap-4">
                  <View className="rounded-[22px] border border-border/70 bg-background px-4 py-4">
                    <View className="flex-row items-center gap-3">
                      <View className="rounded-2xl bg-primary/10 px-3 py-3">
                        <Icon as={UserRound} className="text-primary" size={18} />
                      </View>
                      <View className="flex-1 gap-1">
                        <Text className="text-xs uppercase tracking-[1px] text-muted-foreground">Bill to</Text>
                        <Text className="font-semibold text-foreground">{partyName}</Text>
                      </View>
                    </View>
                    {partyPhone ? (
                      <View className="mt-3 flex-row items-center gap-2">
                        <Icon as={Phone} className="text-muted-foreground" size={14} />
                        <Text className="text-sm text-muted-foreground">{partyPhone}</Text>
                      </View>
                    ) : null}
                    {partyAddress ? (
                      <View className="mt-2 flex-row items-start gap-2">
                        <Icon as={MapPin} className="mt-0.5 text-muted-foreground" size={14} />
                        <Text className="flex-1 text-sm leading-5 text-muted-foreground">{partyAddress}</Text>
                      </View>
                    ) : null}
                  </View>

                  <View className="rounded-[22px] border border-border/70 bg-background px-4 py-4">
                    <Text className="text-xs uppercase tracking-[1px] text-muted-foreground">Final total</Text>
                    <Text className="mt-1 text-3xl font-bold text-foreground">
                      {formatCurrency(data.invoice.grand_total)}
                    </Text>
                  </View>

                  <Button className="h-12 rounded-2xl" onPress={() => void onOpenPdf()}>
                    <Icon as={Download} className="text-primary-foreground" size={16} />
                    <Text>Download PDF</Text>
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-[28px]">
                <CardHeader>
                  <CardTitle>Items</CardTitle>
                  <CardDescription>{data.invoice.items.length} line item(s)</CardDescription>
                </CardHeader>
                <CardContent className="gap-3">
                  {data.invoice.items.map((item, index) => (
                    <View key={`${item.item_name}-${index}`} className="rounded-[22px] border border-border/70 bg-background px-4 py-4">
                      <View className="flex-row items-start justify-between gap-4">
                        <View className="flex-1 gap-1">
                          <Text className="font-semibold text-foreground">{item.item_name}</Text>
                          <Text className="text-sm text-muted-foreground">
                            {item.quantity} {item.unit} | GST {item.gst_rate}%
                          </Text>
                        </View>
                        <Text className="font-semibold text-foreground">{formatCurrency(item.total_amount)}</Text>
                      </View>
                    </View>
                  ))}
                </CardContent>
              </Card>

              <Card className="rounded-[28px]">
                <CardHeader>
                  <CardTitle>Shared from VyaparX</CardTitle>
                </CardHeader>
                <CardContent className="gap-3">
                  <View className="flex-row items-center gap-3 rounded-[22px] border border-border/70 bg-background px-4 py-4">
                    <View className="rounded-2xl bg-primary/10 px-3 py-3">
                      <Icon as={Store} className="text-primary" size={18} />
                    </View>
                    <View className="flex-1 gap-1">
                      <Text className="font-semibold text-foreground">Open in app</Text>
                      <Text className="text-sm leading-5 text-muted-foreground">
                        This digital bill opened directly inside the installed VyaparX app.
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-3 rounded-[22px] border border-border/70 bg-background px-4 py-4">
                    <View className="rounded-2xl bg-primary/10 px-3 py-3">
                      <Icon as={FileText} className="text-primary" size={18} />
                    </View>
                    <View className="flex-1 gap-1">
                      <Text className="font-semibold text-foreground">Invoice number</Text>
                      <Text className="text-sm text-muted-foreground">{data.invoice.invoice_number}</Text>
                    </View>
                  </View>
                </CardContent>
              </Card>
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
