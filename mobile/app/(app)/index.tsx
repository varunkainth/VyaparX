import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowUpRight, BadgeIndianRupee, Building2, ChartColumnBig, PackageCheck, ReceiptText, Users } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { businessService } from '@/services/business.service';
import { Text } from '@/components/ui/text';
import { useAuthStore } from '@/store/auth-store';

const quickStats = [
  { icon: BadgeIndianRupee, label: 'Today sales', value: 'Rs 48,200', tone: 'bg-emerald-500/10 text-emerald-600' },
  { icon: ReceiptText, label: 'Pending invoices', value: '12', tone: 'bg-amber-500/10 text-amber-600' },
  { icon: PackageCheck, label: 'Dispatch ready', value: '9', tone: 'bg-sky-500/10 text-sky-600' },
];

const quickActions = [
  { icon: ReceiptText, label: 'Create invoice', meta: 'GST-ready billing flow' },
  { icon: Users, label: 'Add customer', meta: 'Capture party and balance details' },
  { icon: PackageCheck, label: 'Record delivery', meta: 'Mark orders as fulfilled quickly' },
];

export default function HomeScreen() {
  const { session, user } = useAuthStore();
  const [currentBusinessName, setCurrentBusinessName] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    const loadCurrentBusiness = async () => {
      if (!session?.business_id) {
        if (isMounted) {
          setCurrentBusinessName(null);
        }
        return;
      }

      try {
        const businesses = await businessService.listBusinesses();
        if (!isMounted) {
          return;
        }

        const currentBusiness = businesses.find((business) => business.id === session.business_id) ?? null;
        setCurrentBusinessName(currentBusiness?.name ?? null);
      } catch {
        if (isMounted) {
          setCurrentBusinessName(null);
        }
      }
    };

    void loadCurrentBusiness();

    return () => {
      isMounted = false;
    };
  }, [session?.business_id]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="absolute -left-16 top-10 h-40 w-40 rounded-full bg-primary/8" />
      <View className="absolute right-0 top-44 h-32 w-32 rounded-full bg-secondary/70" />
      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-6 pb-28 pt-4">
        <View className="gap-6">
          <View className="gap-2">
            <Text className="text-sm uppercase tracking-[2px] text-muted-foreground">VyaparX mobile</Text>
            <Text className="text-3xl font-extrabold tracking-tight text-foreground">
              Hello, {user?.name?.split(' ')[0] ?? 'there'}
            </Text>
            <Text className="text-base leading-6 text-muted-foreground">
              A cleaner command center for billing, collections, parties, and stock.
            </Text>
            <View className="mt-2 flex-row items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3">
              <View className="rounded-2xl bg-primary/10 px-3 py-3">
                <Icon as={Building2} className="text-primary" size={18} />
              </View>
              <View className="flex-1 gap-1">
                <Text className="text-sm text-muted-foreground">Current workspace</Text>
                <Text className="font-semibold text-foreground">
                  {currentBusinessName ?? 'Loading business...'}
                </Text>
              </View>
            </View>
          </View>

          <Card className="overflow-hidden rounded-[32px] border-border bg-card">
            <View className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10" />
            <View className="absolute -bottom-12 left-0 h-28 w-28 rounded-full bg-secondary/80" />
            <CardHeader className="gap-3">
              <View className="w-12 rounded-2xl bg-primary px-0 py-3">
                <Icon as={ChartColumnBig} className="mx-auto text-primary-foreground" size={22} />
              </View>
              <CardTitle className="text-3xl leading-9">Today&apos;s business pulse</CardTitle>
              <CardDescription className="leading-6">
                Your most important numbers and actions stay one tap away from the center tab.
              </CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              {quickStats.map((item) => (
                <View
                  key={item.label}
                  className="flex-row items-center justify-between rounded-2xl border border-border/70 bg-background/85 px-4 py-4">
                  <View className="flex-row items-center gap-3">
                    <View className={`rounded-2xl px-3 py-3 ${item.tone}`}>
                      <Icon as={item.icon} size={18} />
                    </View>
                    <Text className="text-sm font-medium text-muted-foreground">{item.label}</Text>
                  </View>
                  <Text className="text-lg font-bold text-foreground">{item.value}</Text>
                </View>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
              <CardDescription>Shortcuts for the flows you repeat all day.</CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              {quickActions.map((item) => (
                <View
                  key={item.label}
                  className="flex-row items-center gap-4 rounded-2xl border border-border/70 bg-background px-4 py-4">
                  <View className="rounded-2xl bg-primary/10 px-3 py-3">
                    <Icon as={item.icon} className="text-primary" size={18} />
                  </View>
                  <View className="flex-1 gap-1">
                    <Text className="font-semibold text-foreground">{item.label}</Text>
                    <Text className="text-sm leading-5 text-muted-foreground">{item.meta}</Text>
                  </View>
                  <Icon as={ArrowUpRight} className="text-muted-foreground" size={18} />
                </View>
              ))}
            </CardContent>
          </Card>

          <Button className="h-14 rounded-[22px]">
            <Text className="text-base">Create first invoice today</Text>
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
