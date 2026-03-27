import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  CirclePlus,
  MapPin,
  Store,
} from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { INDIAN_STATES, formatStateDisplay } from '@/constants/indian-states';
import { useAuthStore } from '@/store/auth-store';
import { useBusinessStore } from '@/store/business-store';
import type { BusinessWithRole } from '@/types/business';

export default function BusinessSetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; return_to?: string }>();
  const { hasHydrated, isAuthenticated, session, user } = useAuthStore();
  const {
    businesses,
    createBusiness,
    ensureBusinesses,
    error,
    isCreatingBusiness,
    isSwitchingBusinessId,
    listStatus,
    switchBusiness,
  } = useBusinessStore();
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [isStatePickerOpen, setIsStatePickerOpen] = React.useState(false);
  const forceCreateMode = params.mode === 'create';
  const returnTo = typeof params.return_to === 'string' && params.return_to.length > 0 ? params.return_to : '/(app)';
  const [form, setForm] = React.useState({
    address_line1: '',
    city: '',
    email: user?.email ?? '',
    invoice_prefix: '',
    name: '',
    phone: user?.phone ?? '',
    pincode: '',
    purchase_prefix: '',
    state: '',
    state_code: '',
    website: '',
  });

  React.useEffect(() => {
    setForm((current) => ({
      ...current,
      email: current.email || user?.email || '',
      phone: current.phone || user?.phone || '',
    }));
  }, [user?.email, user?.phone]);

  React.useEffect(() => {
    if (isAuthenticated && (!session?.business_id || forceCreateMode)) {
      void ensureBusinesses(true);
    }
  }, [ensureBusinesses, forceCreateMode, isAuthenticated, session?.business_id]);

  React.useEffect(() => {
    setShowCreateForm(forceCreateMode || businesses.length === 0);
  }, [businesses.length, forceCreateMode]);

  if (!hasHydrated) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (session?.business_id && !forceCreateMode) {
    return <Redirect href="/(app)" />;
  }

  if (listStatus === 'loading') {
    return <BusinessSetupSkeleton showBackButton={forceCreateMode} onBack={() => router.replace(returnTo)} />;
  }

  async function handleSwitchBusiness(businessId: string) {
    try {
      const business = businesses.find((item) => item.id === businessId);
      if (!business) {
        return;
      }
      await switchBusiness(business);
    } catch {}
  }

  async function handleCreateBusiness() {
    if (
      !form.name.trim() ||
      !form.state_code.trim() ||
      !form.address_line1.trim() ||
      !form.city.trim() ||
      !form.state.trim() ||
      !form.pincode.trim() ||
      !form.phone.trim() ||
      !form.email.trim()
    ) {
      return;
    }

    try {
      await createBusiness({
        address_line1: form.address_line1.trim(),
        city: form.city.trim(),
        email: form.email.trim(),
        invoice_prefix: form.invoice_prefix.trim() || undefined,
        name: form.name.trim(),
        phone: form.phone.trim(),
        pincode: form.pincode.trim(),
        purchase_prefix: form.purchase_prefix.trim() || undefined,
        state: form.state.trim(),
        state_code: form.state_code.trim(),
        website: form.website.trim() || undefined,
      });

      router.replace(returnTo);
    } catch {}
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="absolute -left-12 top-16 h-36 w-36 rounded-full bg-primary/8" />
      <View className="absolute right-0 top-44 h-28 w-28 rounded-full bg-secondary/70" />
      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-6 pb-12 pt-4">
        <View className="gap-6">
          {forceCreateMode ? (
            <Button
              variant="outline"
              className="h-11 self-start rounded-2xl px-4"
              onPress={() => router.replace(returnTo)}>
              <Icon as={ArrowLeft} className="text-foreground" size={16} />
              <Text>Back</Text>
            </Button>
          ) : null}
          <View className="gap-2">
            <Text className="text-sm uppercase tracking-[2px] text-muted-foreground">Business setup</Text>
            <Text className="text-3xl font-extrabold tracking-tight text-foreground">
              {showCreateForm && !businesses.length ? 'Create your first business' : forceCreateMode ? 'Create a new business' : 'Create or choose a business'}
            </Text>
            <Text className="text-base leading-6 text-muted-foreground">
              {forceCreateMode
                ? 'Create another workspace here. Once it is ready, the app will switch into it and take you home.'
                : 'You cannot enter the workspace until at least one business is selected.'}
            </Text>
          </View>

          {error ? (
            <View className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3">
              <Text className="text-sm text-destructive">{error}</Text>
            </View>
          ) : null}

          {businesses.length > 0 && !forceCreateMode ? (
            <Card className="rounded-[28px]">
              <CardHeader>
                <CardTitle>Available businesses</CardTitle>
                <CardDescription>Select a business to continue into the app.</CardDescription>
              </CardHeader>
              <CardContent className="gap-3">
                {businesses.map((business) => (
                  <Pressable
                    key={business.id}
                    className="flex-row items-center gap-4 rounded-2xl border border-border/70 bg-background px-4 py-4"
                    onPress={() => handleSwitchBusiness(business.id)}>
                    <View className="rounded-2xl bg-primary/10 px-3 py-3">
                      <Icon as={Store} className="text-primary" size={18} />
                    </View>
                    <View className="flex-1 gap-1">
                      <Text className="font-semibold text-foreground">{business.name}</Text>
                      <View className="flex-row flex-wrap items-center gap-2">
                        <RoleBadge role={business.role} />
                      </View>
                    </View>
                    {isSwitchingBusinessId === business.id ? (
                      <ActivityIndicator />
                    ) : (
                      <Icon as={ArrowRight} className="text-muted-foreground" size={18} />
                    )}
                  </Pressable>
                ))}

                <Button
                  variant="outline"
                  className="h-12 gap-2 rounded-2xl"
                  onPress={() => setShowCreateForm((current) => !current)}>
                  <Icon as={CirclePlus} className="text-foreground" size={16} />
                  <Text>{showCreateForm ? 'Hide create form' : 'Create a new business'}</Text>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {showCreateForm ? (
            <Card className="rounded-[28px]">
              <CardHeader>
                <CardTitle>Create business</CardTitle>
                <CardDescription>
                  {businesses.length > 0
                    ? 'Complete the minimum required business details to add another workspace.'
                    : 'Complete the minimum required business details to continue.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="gap-4">
                <Field label="Business name">
                  <Input value={form.name} onChangeText={(value) => setForm((current) => ({ ...current, name: value }))} />
                </Field>
                <Field label="Address line 1">
                  <Input
                    value={form.address_line1}
                    onChangeText={(value) => setForm((current) => ({ ...current, address_line1: value }))}
                  />
                </Field>
                <Field label="City">
                  <Input value={form.city} onChangeText={(value) => setForm((current) => ({ ...current, city: value }))} />
                </Field>
                <Field label="State">
                  <SelectionCard
                    icon={MapPin}
                    label="Select state"
                    value={form.state_code ? formatStateDisplay({ code: form.state_code, name: form.state, type: 'state' as const }) : 'Choose state'}
                    onPress={() => setIsStatePickerOpen(true)}
                  />
                </Field>
                <Field label="Pincode">
                  <Input
                    keyboardType="number-pad"
                    value={form.pincode}
                    onChangeText={(value) => setForm((current) => ({ ...current, pincode: value }))}
                  />
                </Field>
                <Field label="Phone">
                  <Input
                    keyboardType="phone-pad"
                    value={form.phone}
                    onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))}
                  />
                </Field>
                <Field label="Email">
                  <Input
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={form.email}
                    onChangeText={(value) => setForm((current) => ({ ...current, email: value }))}
                  />
                </Field>
                <Field label="Website">
                  <Input
                    autoCapitalize="none"
                    keyboardType="url"
                    placeholder="https://example.com"
                    value={form.website}
                    onChangeText={(value) => setForm((current) => ({ ...current, website: value }))}
                  />
                </Field>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Field label="Sales prefix">
                      <Input
                        autoCapitalize="characters"
                        value={form.invoice_prefix}
                        onChangeText={(value) => setForm((current) => ({ ...current, invoice_prefix: value.toUpperCase() }))}
                      />
                    </Field>
                  </View>
                  <View className="flex-1">
                    <Field label="Purchase prefix">
                      <Input
                        autoCapitalize="characters"
                        value={form.purchase_prefix}
                        onChangeText={(value) => setForm((current) => ({ ...current, purchase_prefix: value.toUpperCase() }))}
                      />
                    </Field>
                  </View>
                </View>
                <Button className="h-14 gap-2 rounded-[22px]" disabled={isCreatingBusiness} onPress={handleCreateBusiness}>
                  {isCreatingBusiness ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <Icon as={BriefcaseBusiness} className="text-primary-foreground" size={16} />
                      <Text>{businesses.length > 0 ? 'Create, switch, and continue' : 'Create business and continue'}</Text>
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </View>
      </ScrollView>
      <Dialog open={isStatePickerOpen} onOpenChange={setIsStatePickerOpen}>
        <DialogContent className="max-w-[420px] rounded-[28px]">
          <DialogHeader>
            <DialogTitle>Select state</DialogTitle>
            <DialogDescription>Choose the business billing state.</DialogDescription>
          </DialogHeader>
          <ScrollView className="max-h-[360px]">
            <View className="gap-3">
              {INDIAN_STATES.map((state) => (
                <PickerOption
                  key={state.code}
                  title={formatStateDisplay(state)}
                  selected={form.state_code === state.code}
                  onPress={() => {
                    setForm((current) => ({
                      ...current,
                      state: state.name,
                      state_code: state.code,
                    }));
                    setIsStatePickerOpen(false);
                  }}
                />
              ))}
            </View>
          </ScrollView>
        </DialogContent>
      </Dialog>
    </SafeAreaView>
  );
}

function BusinessSetupSkeleton({
  onBack,
  showBackButton,
}: {
  onBack: () => void;
  showBackButton: boolean;
}) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-6 pb-12 pt-4">
        <View className="gap-6">
          {showBackButton ? (
            <Button variant="outline" className="h-11 self-start rounded-2xl px-4" onPress={onBack}>
              <Icon as={ArrowLeft} className="text-foreground" size={16} />
              <Text>Back</Text>
            </Button>
          ) : null}
          <View className="gap-3">
            <View className="h-4 w-28 rounded-full bg-muted" />
            <View className="h-10 w-64 rounded-full bg-muted" />
            <View className="h-5 w-full rounded-full bg-muted" />
            <View className="h-5 w-5/6 rounded-full bg-muted" />
          </View>
          <Card className="rounded-[28px]">
            <CardHeader>
              <View className="h-6 w-40 rounded-full bg-muted" />
              <View className="mt-2 h-4 w-60 rounded-full bg-muted" />
            </CardHeader>
            <CardContent className="gap-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <View
                  key={index}
                  className="flex-row items-center gap-4 rounded-2xl border border-border/70 bg-background px-4 py-4">
                  <View className="h-12 w-12 rounded-2xl bg-muted" />
                  <View className="flex-1 gap-2">
                    <View className="h-5 w-36 rounded-full bg-muted" />
                    <View className="h-4 w-20 rounded-full bg-muted" />
                  </View>
                  <View className="h-5 w-5 rounded-full bg-muted" />
                </View>
              ))}
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <View className="gap-2">
      <Label>{label}</Label>
      {children}
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

function SelectionCard({
  icon,
  label,
  onPress,
  value,
}: {
  icon: typeof Building2;
  label: string;
  onPress: () => void;
  value: string;
}) {
  return (
    <Pressable
      className="flex-row items-center gap-4 rounded-[24px] border border-border/70 bg-background px-4 py-4"
      onPress={onPress}>
      <View className="rounded-2xl bg-primary/10 px-3 py-3">
        <Icon as={icon} className="text-primary" size={18} />
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-sm text-muted-foreground">{label}</Text>
        <Text className="font-semibold text-foreground">{value}</Text>
      </View>
      <Icon as={ChevronDown} className="text-muted-foreground" size={18} />
    </Pressable>
  );
}

function PickerOption({
  onPress,
  selected,
  title,
}: {
  onPress: () => void;
  selected: boolean;
  title: string;
}) {
  return (
    <Pressable
      className={`rounded-[22px] border px-4 py-4 ${selected ? 'border-primary bg-primary/10' : 'border-border/70 bg-background'}`}
      onPress={onPress}>
      <Text className="font-semibold text-foreground">{title}</Text>
    </Pressable>
  );
}
