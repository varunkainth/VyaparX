import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowUpRight, BadgeIndianRupee, CreditCard, FileClock, ReceiptText, TriangleAlert } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

const invoiceRows = [
  ['INV-2041', 'Aditi Traders', 'Rs 14,200', 'Pending'],
  ['INV-2040', 'Metro Super Store', 'Rs 8,800', 'Paid'],
  ['INV-2039', 'Sharma Wholesale', 'Rs 22,450', 'Overdue'],
];

export default function InvoicesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="absolute -left-10 top-14 h-32 w-32 rounded-full bg-primary/8" />
      <View className="absolute right-0 top-44 h-28 w-28 rounded-full bg-secondary/70" />
      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-6 pb-28 pt-4">
        <View className="gap-6">
          <View className="gap-2">
            <Text className="text-sm uppercase tracking-[2px] text-muted-foreground">Invoices</Text>
            <Text className="text-3xl font-extrabold tracking-tight text-foreground">Billing flow</Text>
            <Text className="text-base leading-6 text-muted-foreground">
              Track issued invoices, due payments, and urgent follow-up items from one screen.
            </Text>
          </View>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Billing status</CardTitle>
              <CardDescription>Quick reading before you jump into invoice details.</CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              <StatusRow icon={ReceiptText} label="24 invoices this week" />
              <StatusRow icon={BadgeIndianRupee} label="Rs 3.6L billed so far" />
              <StatusRow icon={FileClock} label="5 invoices waiting for payment" />
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Recent invoices</CardTitle>
              <CardDescription>Focused list for the latest billing actions.</CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              {invoiceRows.map(([number, party, amount, state]) => (
                <View
                  key={number}
                  className="rounded-2xl border border-border/70 bg-background px-4 py-4">
                  <View className="flex-row items-center justify-between gap-4">
                    <View className="gap-1">
                      <Text className="font-semibold text-foreground">{number}</Text>
                      <Text className="text-sm leading-5 text-muted-foreground">{party}</Text>
                    </View>
                    <View className="items-end gap-1">
                      <Text className="font-semibold text-foreground">{amount}</Text>
                      <Text className="text-sm text-muted-foreground">{state}</Text>
                    </View>
                  </View>
                </View>
              ))}
              <View className="flex-row items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-4">
                <Icon as={TriangleAlert} className="text-amber-600" size={18} />
                <Text className="flex-1 text-sm leading-6 text-amber-700">
                  Overdue invoices should stay visually prominent in the final production list.
                </Text>
              </View>
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Collections tools</CardTitle>
              <CardDescription>Jump into billing and money movement screens.</CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              <Pressable onPress={() => router.push('/(app)/payments')}>
                <Button variant="outline" className="h-14 justify-between rounded-2xl px-4">
                  <View className="flex-row items-center gap-3">
                    <Icon as={CreditCard} className="text-primary" size={18} />
                    <Text>Payments</Text>
                  </View>
                  <Icon as={ArrowUpRight} className="text-muted-foreground" size={18} />
                </Button>
              </Pressable>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusRow({ icon, label }: { icon: typeof ReceiptText; label: string }) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-border/70 bg-background px-4 py-4">
      <View className="rounded-2xl bg-primary/10 px-3 py-3">
        <Icon as={icon} className="text-primary" size={18} />
      </View>
      <Text className="font-medium text-foreground">{label}</Text>
    </View>
  );
}
