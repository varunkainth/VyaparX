import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookOpenText, CircleDollarSign, History, ReceiptText } from 'lucide-react-native';

import { SubpageHeader } from '@/components/subpage-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

const ledgerEntries = [
  ['Opening balance', 'Rs 12,500', 'Aditi Traders'],
  ['Invoice posted', 'Rs 14,200', 'INV-2041'],
  ['Payment received', 'Rs 8,000', 'Bank transfer'],
];

export default function LedgerScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-6 pb-28 pt-4">
        <View className="gap-6">
          <SubpageHeader
            backHref="/(app)/customers"
            eyebrow="Party ledger"
            subtitle="Ledger belongs with customers because it is part of the party relationship workflow."
            title="Customer statements"
          />

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Ledger overview</CardTitle>
              <CardDescription>Snapshot before opening detailed statements and filters.</CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              <LedgerPill icon={BookOpenText} label="128 ledger accounts" />
              <LedgerPill icon={CircleDollarSign} label="Rs 1.82L receivable balance" />
              <LedgerPill icon={History} label="42 recent statement entries" />
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Recent entries</CardTitle>
              <CardDescription>Latest movement in party accounting.</CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              {ledgerEntries.map(([title, amount, meta]) => (
                <View
                  key={`${title}-${meta}`}
                  className="flex-row items-center gap-4 rounded-2xl border border-border/70 bg-background px-4 py-4">
                  <View className="rounded-2xl bg-primary/10 px-3 py-3">
                    <Icon as={ReceiptText} className="text-primary" size={18} />
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

function LedgerPill({ icon, label }: { icon: typeof BookOpenText; label: string }) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-border/70 bg-background px-4 py-4">
      <View className="rounded-2xl bg-primary/10 px-3 py-3">
        <Icon as={icon} className="text-primary" size={18} />
      </View>
      <Text className="font-medium text-foreground">{label}</Text>
    </View>
  );
}
