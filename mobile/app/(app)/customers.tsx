import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowUpRight, CircleDollarSign, Phone, ScrollText, UserPlus, Users } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

const customerRows = [
  ['Aditi Traders', 'Rs 24,000 due', 'Call today'],
  ['Metro Super Store', 'Rs 0 balance', 'Healthy account'],
  ['Sharma Wholesale', 'Rs 8,200 due', 'Payment reminder'],
];

export default function CustomersScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="absolute -left-12 top-16 h-32 w-32 rounded-full bg-primary/8" />
      <View className="absolute right-0 top-40 h-28 w-28 rounded-full bg-secondary/70" />
      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-6 pb-28 pt-4">
        <View className="gap-6">
          <View className="gap-2">
            <Text className="text-sm uppercase tracking-[2px] text-muted-foreground">Customers</Text>
            <Text className="text-3xl font-extrabold tracking-tight text-foreground">Party book</Text>
            <Text className="text-base leading-6 text-muted-foreground">
              Keep customer balances, contacts, and follow-ups easy to scan on mobile.
            </Text>
          </View>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Highlights</CardTitle>
              <CardDescription>What matters most before you open a customer account.</CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              <MiniPill icon={Users} label="128 active customers" />
              <MiniPill icon={CircleDollarSign} label="Rs 1.82L total receivables" />
              <MiniPill icon={UserPlus} label="6 new parties this week" />
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Need attention</CardTitle>
              <CardDescription>Quick collection and relationship follow-ups.</CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              {customerRows.map(([name, amount, meta]) => (
                <View
                  key={name}
                  className="flex-row items-center gap-4 rounded-2xl border border-border/70 bg-background px-4 py-4">
                  <View className="rounded-2xl bg-primary/10 px-3 py-3">
                    <Icon as={Phone} className="text-primary" size={18} />
                  </View>
                  <View className="flex-1 gap-1">
                    <Text className="font-semibold text-foreground">{name}</Text>
                    <Text className="text-sm leading-5 text-muted-foreground">{meta}</Text>
                  </View>
                  <Text className="text-sm font-semibold text-foreground">{amount}</Text>
                </View>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Customer tools</CardTitle>
              <CardDescription>Open deeper customer finance views from here.</CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              <Pressable onPress={() => router.push('/(app)/ledger')}>
                <Button variant="outline" className="h-14 justify-between rounded-2xl px-4">
                  <View className="flex-row items-center gap-3">
                    <Icon as={ScrollText} className="text-primary" size={18} />
                    <Text>Party ledger</Text>
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

function MiniPill({ icon, label }: { icon: typeof Users; label: string }) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-border/70 bg-background px-4 py-4">
      <View className="rounded-2xl bg-primary/10 px-3 py-3">
        <Icon as={icon} className="text-primary" size={18} />
      </View>
      <Text className="font-medium text-foreground">{label}</Text>
    </View>
  );
}
