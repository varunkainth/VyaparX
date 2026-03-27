import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowRightLeft,
  Building2,
  Check,
  ChevronRight,
  CirclePlus,
  FileBadge2,
  MapPinned,
  ReceiptIndianRupee,
  Store,
  Users,
} from 'lucide-react-native';

import { ListScreenSkeleton } from '@/components/screen-skeleton';
import { SubpageHeader } from '@/components/subpage-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useAuthStore } from '@/store/auth-store';
import { useBusinessStore } from '@/store/business-store';
import type { BusinessWithRole } from '@/types/business';

const businessModules = [
  ['Business profile', 'Company identity and registration details', Building2],
  ['GST and tax', 'GSTIN, PAN, and tax setup', FileBadge2],
  ['Address and contact', 'Office address and communication details', MapPinned],
  ['Invoice and banking', 'Invoice defaults, bank, and UPI details', ReceiptIndianRupee],
  ['Invoice settings', 'Numbering, templates, tax display, and email defaults', ReceiptIndianRupee],
  ['Members and roles', 'Team access and permission management', Users],
] as const;

export default function BusinessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuthStore();
  const {
    businesses,
    currentBusiness,
    ensureBusinesses,
    error,
    isSwitchingBusinessId,
    listStatus,
    switchBusiness,
  } = useBusinessStore();

  React.useEffect(() => {
    void ensureBusinesses();
  }, [ensureBusinesses]);

  async function handleSwitchBusiness(business: BusinessWithRole) {
    try {
      await switchBusiness(business);
      router.replace('/(app)');
    } catch {}
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1">
        <ScrollView className="flex-1 bg-background" contentContainerClassName="px-6 pb-32 pt-4">
          <View className="gap-6">
            <SubpageHeader
              backHref="/(app)/more"
              eyebrow="Business"
              subtitle="See the active workspace, switch between businesses, create a new one, and open business-level settings."
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
                  onPress={() => {
                    if (title === 'Members and roles') {
                      router.push('/(app)/business-members');
                      return;
                    }

                    if (title === 'Invoice settings') {
                      router.push('/(app)/invoice-settings');
                      return;
                    }

                    router.push('/(app)/business-settings');
                  }}>
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
                {listStatus === 'loading' ? (
                  <ListScreenSkeleton rowCount={4} />
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
                        <View className="flex-row flex-wrap items-center gap-2">
                          <RoleBadge role={business.role} />
                        </View>
                      </View>
                      {business.id === session?.business_id ? (
                        <View className="rounded-full bg-primary/10 px-3 py-1">
                          <Text className="text-xs font-semibold uppercase tracking-[1px] text-primary">Current</Text>
                        </View>
                      ) : isSwitchingBusinessId === business.id ? (
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

        <Pressable
          accessibilityLabel="Create business"
          accessibilityRole="button"
          className="absolute right-6 z-50 h-16 w-16 items-center justify-center rounded-full bg-primary"
          style={{
            bottom: Math.max(insets.bottom, 10) + 92,
            elevation: 8,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.18,
            shadowRadius: 18,
          }}
          onPress={() =>
            router.push({
              pathname: '/business-setup',
              params: { mode: 'create', return_to: '/(app)/business' },
            })
          }>
          <Icon as={CirclePlus} className="text-primary-foreground" size={26} />
        </Pressable>
      </View>
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
        <View className="flex-row flex-wrap items-center gap-2">
          <RoleBadge role={business.role} />
        </View>
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

function RoleBadge({ role }: { role?: BusinessWithRole['role'] | null }) {
  return (
    <View className="rounded-full bg-secondary px-3 py-1">
      <Text className="text-xs font-semibold uppercase tracking-[1px] text-foreground">
        {formatRole(role)}
      </Text>
    </View>
  );
}

function formatRole(role?: string | null) {
  if (!role) {
    return 'unknown role';
  }

  return role.replace('_', ' ');
}
