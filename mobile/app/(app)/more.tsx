import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  BriefcaseBusiness,
  ChartColumnBig,
  ChevronRight,
  LogOut,
  Settings2,
  UserRound,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth-store';

const moreLinks = [
  {
    description: 'Account identity, phone, email, and workspace access.',
    href: '/(app)/profile' as const,
    icon: UserRound,
    title: 'Profile',
  },
  {
    description: 'Theme, preferences, password, and app behavior configuration.',
    href: '/(app)/settings' as const,
    icon: Settings2,
    title: 'Settings',
  },
  {
    description: 'Business profile, company details, switching, and operational setup.',
    href: '/(app)/business' as const,
    icon: BriefcaseBusiness,
    title: 'Business',
  },
  {
    description: 'Sales, inventory, and financial performance reports.',
    href: '/(app)/reports' as const,
    icon: ChartColumnBig,
    title: 'Reports',
  },
] as const;

export default function MoreScreen() {
  const router = useRouter();
  const { clearAuth } = useAuthStore();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  async function onLogout() {
    setIsLoggingOut(true);

    try {
      await authService.logout();
    } catch {}

    await clearAuth();
    router.replace('/(auth)/login');
    setIsLoggingOut(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="absolute -left-10 top-16 h-32 w-32 rounded-full bg-primary/8" />
      <View className="absolute right-0 top-42 h-28 w-28 rounded-full bg-secondary/70" />
      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-6 pb-28 pt-4">
        <View className="gap-6">
          <View className="gap-2">
            <Text className="text-sm uppercase tracking-[2px] text-muted-foreground">More</Text>
            <Text className="text-3xl font-extrabold tracking-tight text-foreground">Workspace hub</Text>
            <Text className="text-base leading-6 text-muted-foreground">
              Keep profile, settings, business controls, and reports in one secondary navigation area.
            </Text>
          </View>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Manage workspace</CardTitle>
              <CardDescription>Open the deeper administrative and reporting sections from here.</CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              {moreLinks.map((item) => (
                <Pressable
                  key={item.title}
                  className="flex-row items-center gap-4 rounded-2xl border border-border/70 bg-background px-4 py-4"
                  onPress={() => router.push(item.href)}>
                  <View className="rounded-2xl bg-primary/10 px-3 py-3">
                    <Icon as={item.icon} className="text-primary" size={18} />
                  </View>
                  <View className="flex-1 gap-1">
                    <Text className="font-semibold text-foreground">{item.title}</Text>
                    <Text className="text-sm leading-5 text-muted-foreground">{item.description}</Text>
                  </View>
                  <Icon as={ChevronRight} className="text-muted-foreground" size={18} />
                </Pressable>
              ))}
            </CardContent>
          </Card>

          <Button
            variant="destructive"
            className="mb-6 h-14 w-full gap-2 rounded-[24px]"
            disabled={isLoggingOut}
            onPress={onLogout}>
            {isLoggingOut ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Icon as={LogOut} className="text-white" size={18} />
                <Text className="text-base">Logout</Text>
              </>
            )}
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
