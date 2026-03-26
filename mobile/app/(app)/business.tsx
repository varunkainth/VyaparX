import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
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

import { SubpageHeader } from '@/components/subpage-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { authService } from '@/services/auth.service';
import { businessService } from '@/services/business.service';
import { useAuthStore } from '@/store/auth-store';
import type { BusinessWithRole, CreateBusinessInput } from '@/types/business';

const businessModules = [
  ['Business profile', 'Company identity and registration details', Building2],
  ['GST and tax', 'GSTIN, PAN, and tax setup', FileBadge2],
  ['Address and contact', 'Office address and communication details', MapPinned],
  ['Invoice and banking', 'Invoice defaults, bank, and UPI details', ReceiptIndianRupee],
  ['Members and roles', 'Team access and permission management', Users],
] as const;

const initialCreateForm: CreateBusinessInput = {
  address_line1: '',
  address_line2: '',
  bank_account_no: '',
  bank_branch: '',
  bank_ifsc: '',
  bank_name: '',
  city: '',
  email: '',
  gstin: '',
  invoice_prefix: '',
  logo_url: '',
  name: '',
  pan: '',
  phone: '',
  pincode: '',
  signature_url: '',
  state: '',
  state_code: '',
  upi_id: '',
  website: '',
};

export default function BusinessScreen() {
  const router = useRouter();
  const { session, setAuth, setSession, setTokens, user } = useAuthStore();
  const [businesses, setBusinesses] = React.useState<BusinessWithRole[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [switchingId, setSwitchingId] = React.useState<string | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [createForm, setCreateForm] = React.useState<CreateBusinessInput>({
    ...initialCreateForm,
    email: user?.email ?? '',
    phone: user?.phone ?? '',
  });

  const loadBusinesses = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const items = await businessService.listBusinesses();
      setBusinesses(items);
    } catch (loadError: any) {
      setError(
        loadError?.response?.data?.error?.message ??
          loadError?.response?.data?.message ??
          'Unable to load businesses right now.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadBusinesses();
  }, [loadBusinesses]);

  React.useEffect(() => {
    setCreateForm((current) => ({
      ...current,
      email: current.email || user?.email || '',
      phone: current.phone || user?.phone || '',
    }));
  }, [user?.email, user?.phone]);

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

  async function handleCreateBusiness() {
    if (
      !createForm.name.trim() ||
      !createForm.state_code.trim() ||
      !createForm.address_line1.trim() ||
      !createForm.city.trim() ||
      !createForm.state.trim() ||
      !createForm.pincode.trim() ||
      !createForm.phone.trim() ||
      !createForm.email.trim()
    ) {
      setError('Complete the required business fields first.');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await businessService.createBusiness({
        ...createForm,
        address_line1: createForm.address_line1.trim(),
        address_line2: createForm.address_line2?.trim() || undefined,
        bank_account_no: createForm.bank_account_no?.trim() || undefined,
        bank_branch: createForm.bank_branch?.trim() || undefined,
        bank_ifsc: createForm.bank_ifsc?.trim() || undefined,
        bank_name: createForm.bank_name?.trim() || undefined,
        city: createForm.city.trim(),
        email: createForm.email.trim(),
        gstin: createForm.gstin?.trim() || undefined,
        invoice_prefix: createForm.invoice_prefix?.trim() || undefined,
        logo_url: createForm.logo_url?.trim() || undefined,
        name: createForm.name.trim(),
        pan: createForm.pan?.trim() || undefined,
        phone: createForm.phone.trim(),
        pincode: createForm.pincode.trim(),
        signature_url: createForm.signature_url?.trim() || undefined,
        state: createForm.state.trim(),
        state_code: createForm.state_code.trim().toUpperCase(),
        upi_id: createForm.upi_id?.trim() || undefined,
        website: createForm.website?.trim() || undefined,
      });

      if (user) {
        setAuth(user, response.tokens, response.session);
      } else {
        setTokens(response.tokens);
        setSession(response.session);
      }

      setCreateForm({
        ...initialCreateForm,
        email: user?.email ?? '',
        phone: user?.phone ?? '',
      });
      setShowCreateForm(false);
      await loadBusinesses();
      router.replace('/(app)');
    } catch (createError: any) {
      setError(
        createError?.response?.data?.error?.message ??
          createError?.response?.data?.message ??
          'Unable to create business right now.'
      );
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-6 pb-28 pt-4">
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
                  onPress={() =>
                    router.push(title === 'Members and roles' ? '/(app)/business-members' : '/(app)/business-settings')
                  }>
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
              <CardTitle>Create business</CardTitle>
              <CardDescription>Add another workspace without leaving the app.</CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              <Button
                variant={showCreateForm ? 'secondary' : 'outline'}
                className="h-12 gap-2 rounded-2xl"
                onPress={() => setShowCreateForm((current) => !current)}>
                <Icon as={CirclePlus} className="text-foreground" size={16} />
                <Text>{showCreateForm ? 'Hide create form' : 'Create new business'}</Text>
              </Button>

              {showCreateForm ? (
                <View className="gap-4 rounded-[24px] border border-border/70 bg-background px-4 py-4">
                  <BusinessField label="Business name">
                    <Input value={createForm.name} onChangeText={(value) => setCreateForm((current) => ({ ...current, name: value }))} />
                  </BusinessField>
                  <BusinessField label="Address line 1">
                    <Input
                      value={createForm.address_line1}
                      onChangeText={(value) => setCreateForm((current) => ({ ...current, address_line1: value }))}
                    />
                  </BusinessField>
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <BusinessField label="City">
                        <Input value={createForm.city} onChangeText={(value) => setCreateForm((current) => ({ ...current, city: value }))} />
                      </BusinessField>
                    </View>
                    <View className="flex-1">
                      <BusinessField label="State">
                        <Input value={createForm.state} onChangeText={(value) => setCreateForm((current) => ({ ...current, state: value }))} />
                      </BusinessField>
                    </View>
                  </View>
                  <View className="flex-row gap-3">
                    <View className="w-24">
                      <BusinessField label="Code">
                        <Input
                          autoCapitalize="characters"
                          maxLength={2}
                          value={createForm.state_code}
                          onChangeText={(value) => setCreateForm((current) => ({ ...current, state_code: value.toUpperCase() }))}
                        />
                      </BusinessField>
                    </View>
                    <View className="flex-1">
                      <BusinessField label="Pincode">
                        <Input
                          keyboardType="number-pad"
                          value={createForm.pincode}
                          onChangeText={(value) => setCreateForm((current) => ({ ...current, pincode: value }))}
                        />
                      </BusinessField>
                    </View>
                  </View>
                  <BusinessField label="Phone">
                    <Input
                      keyboardType="phone-pad"
                      value={createForm.phone}
                      onChangeText={(value) => setCreateForm((current) => ({ ...current, phone: value }))}
                    />
                  </BusinessField>
                  <BusinessField label="Email">
                    <Input
                      autoCapitalize="none"
                      keyboardType="email-address"
                      value={createForm.email}
                      onChangeText={(value) => setCreateForm((current) => ({ ...current, email: value }))}
                    />
                  </BusinessField>
                  <Button className="h-14 gap-2 rounded-[22px]" disabled={isCreating} onPress={handleCreateBusiness}>
                    {isCreating ? <ActivityIndicator color="#ffffff" /> : <Text>Create business and switch</Text>}
                  </Button>
                </View>
              ) : null}
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

function BusinessField({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <View className="gap-2">
      <Label>{label}</Label>
      {children}
    </View>
  );
}
