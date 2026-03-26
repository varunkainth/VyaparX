import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRightLeft, Building2, Check, ChevronRight, FileBadge2, MapPinned, ReceiptIndianRupee, Store, Users } from 'lucide-react-native';

import { SubpageHeader } from '@/components/subpage-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { authService } from '@/services/auth.service';
import { businessService } from '@/services/business.service';
import { useAuthStore } from '@/store/auth-store';
import type { BusinessWithRole } from '@/types/business';

const businessModules = [
  ['Business profile', 'Company identity and registration details', Building2],
  ['GST and tax', 'GSTIN, PAN, and tax setup', FileBadge2],
  ['Address and contact', 'Office address and communication details', MapPinned],
  ['Invoice and banking', 'Invoice defaults, bank, and UPI details', ReceiptIndianRupee],
  ['Members and roles', 'Team access and permission management', Users],
] as const;

export default function BusinessScreen() {
  const router = useRouter();
  const { session, setAuth, setSession, setTokens, user } = useAuthStore();
  const [businesses, setBusinesses] = React.useState<BusinessWithRole[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [switchingId, setSwitchingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    const loadBusinesses = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const items = await businessService.listBusinesses();
        if (isMounted) {
          setBusinesses(items);
        }
      } catch (loadError: any) {
        if (isMounted) {
          setError(
            loadError?.response?.data?.error?.message ??
              loadError?.response?.data?.message ??
              'Unable to load businesses right now.'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadBusinesses();

    return () => {
      isMounted = false;
    };
  }, []);

  const currentBusiness = businesses.find((business) => business.id === session?.business_id) ?? null;

  async function handleSwitchBusiness(business: BusinessWithRole) {
    if (business.id === session?.business_id) {
      return;
    }

    setSwitchingId(business.id);
    setError(null);

    try {
      const response = await authService.switchBusiness(business.id);

      if (user) {
        setAuth(user, response.tokens, response.session);
      } else {
        setTokens(response.tokens);
        setSession(response.session);
      }

      router.replace('/(app)');
    } catch (switchError: any) {
      setError(
        switchError?.response?.data?.error?.message ??
          switchError?.response?.data?.message ??
          'Unable to switch business right now.'
      );
    } finally {
      setSwitchingId(null);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-6 pb-28 pt-4">
        <View className="gap-6">
          <SubpageHeader
            backHref="/(app)/more"
            eyebrow="Business"
            subtitle="See the active workspace, switch between businesses, and open business-level settings."
            title="Workspace manager"
          />

          {error ? (
            <View className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3">
              <Text className="text-sm text-destructive">{error}</Text>
            </View>
          ) : null}

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Current workspace</CardTitle>
              <CardDescription>The business currently active across the app.</CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              {currentBusiness ? (
                <BusinessRow business={currentBusiness} current />
              ) : (
                <View className="rounded-2xl border border-border/70 bg-background px-4 py-4">
                  <Text className="font-semibold text-foreground">No active business selected</Text>
                  <Text className="mt-1 text-sm leading-6 text-muted-foreground">
                    Select one from the list below to continue working.
                  </Text>
                </View>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Business settings</CardTitle>
              <CardDescription>Open business-level configuration and management sections.</CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              {businessModules.map(([title, description, icon]) => (
                <Pressable
                  key={title}
                  className="flex-row items-center gap-4 rounded-2xl border border-border/70 bg-background px-4 py-4"
                  onPress={() => router.push('/(app)/business-settings')}>
                  <View className="rounded-2xl bg-primary/10 px-3 py-3">
                    <Icon as={icon} className="text-primary" size={18} />
                  </View>
                  <View className="flex-1 gap-1">
                    <Text className="font-semibold text-foreground">{title}</Text>
                    <Text className="text-sm leading-5 text-muted-foreground">{description}</Text>
                  </View>
                  <Icon as={ChevronRight} className="text-muted-foreground" size={18} />
                </Pressable>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Switch business</CardTitle>
              <CardDescription>Every business you have access to appears here.</CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              {isLoading ? (
                <View className="items-center py-8">
                  <ActivityIndicator />
                </View>
              ) : (
                businesses.map((business) => (
                  <Pressable
                    key={business.id}
                    className="flex-row items-center gap-4 rounded-2xl border border-border/70 bg-background px-4 py-4"
                    onPress={() => handleSwitchBusiness(business)}>
                    <View className="rounded-2xl bg-primary/10 px-3 py-3">
                      <Icon as={business.id === session?.business_id ? Building2 : Store} className="text-primary" size={18} />
                    </View>
                    <View className="flex-1 gap-1">
                      <Text className="font-semibold text-foreground">{business.name}</Text>
                      <Text className="text-sm leading-5 text-muted-foreground">Role: {business.role}</Text>
                    </View>
                    {business.id === session?.business_id ? (
                      <View className="rounded-full bg-primary/10 px-3 py-1">
                        <Text className="text-xs font-semibold uppercase tracking-[1px] text-primary">Current</Text>
                      </View>
                    ) : switchingId === business.id ? (
                      <ActivityIndicator />
                    ) : (
                      <Icon as={ArrowRightLeft} className="text-muted-foreground" size={18} />
                    )}
                  </Pressable>
                ))
              )}
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BusinessRow({ business, current = false }: { business: BusinessWithRole; current?: boolean }) {
  return (
    <View className="flex-row items-center gap-4 rounded-2xl border border-border/70 bg-background px-4 py-4">
      <View className="rounded-2xl bg-primary/10 px-3 py-3">
        <Icon as={Building2} className="text-primary" size={18} />
      </View>
      <View className="flex-1 gap-1">
        <Text className="font-semibold text-foreground">{business.name}</Text>
        <Text className="text-sm leading-5 text-muted-foreground">Role: {business.role}</Text>
      </View>
      {current ? (
        <View className="rounded-full bg-primary/10 px-3 py-1">
          <View className="flex-row items-center gap-1.5">
            <Icon as={Check} className="text-primary" size={14} />
            <Text className="text-xs font-semibold uppercase tracking-[1px] text-primary">Active</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
