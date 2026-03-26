import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BanknoteArrowDown, CircleDollarSign, CreditCard, Wallet } from 'lucide-react-native';

import { SubpageHeader } from '@/components/subpage-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

const paymentItems = [
  ['Invoice collection', 'Rs 8,000', 'Aditi Traders'],
  ['Advance payment', 'Rs 5,500', 'Metro Super Store'],
  ['Cash received', 'Rs 2,200', 'Walk-in counter'],
];

export default function PaymentsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-6 pb-28 pt-4">
        <View className="gap-6">
          <SubpageHeader
            backHref="/(app)/invoices"
            eyebrow="Payments"
            subtitle="Payments live under invoices because they are part of billing and collection follow-up."
            title="Collections desk"
          />

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Payment overview</CardTitle>
              <CardDescription>Summary before opening detailed collection activity.</CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              <PaymentPill icon={Wallet} label="Rs 62,400 collected this week" />
              <PaymentPill icon={CircleDollarSign} label="Rs 18,200 pending collection" />
              <PaymentPill icon={BanknoteArrowDown} label="9 payment events today" />
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Recent payments</CardTitle>
              <CardDescription>Latest inflow activity tied to billing.</CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              {paymentItems.map(([title, amount, meta]) => (
                <View
                  key={`${title}-${meta}`}
                  className="flex-row items-center gap-4 rounded-2xl border border-border/70 bg-background px-4 py-4">
                  <View className="rounded-2xl bg-primary/10 px-3 py-3">
                    <Icon as={CreditCard} className="text-primary" size={18} />
                  </View>
                  <View className="flex-1 gap-1">
                    <Text className="font-semibold text-foreground">{title}</Text>
                    <Text className="text-sm leading-5 text-muted-foreground">{meta}</Text>
                  </View>
                  <Text className="text-sm font-semibold text-foreground">{amount}</Text>
                </View>
              ))}
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PaymentPill({ icon, label }: { icon: typeof Wallet; label: string }) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-border/70 bg-background px-4 py-4">
      <View className="rounded-2xl bg-primary/10 px-3 py-3">
        <Icon as={icon} className="text-primary" size={18} />
      </View>
      <Text className="font-medium text-foreground">{label}</Text>
    </View>
  );
}
