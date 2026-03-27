import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, BriefcaseBusiness, Building2, CirclePlus, Store } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { authService } from '@/services/auth.service';
import { businessService } from '@/services/business.service';
import { useAuthStore } from '@/store/auth-store';
import type { BusinessWithRole } from '@/types/business';

export default function BusinessSetupScreen() {
  const { hasHydrated, isAuthenticated, session, setAuth, setSession, setTokens, user } = useAuthStore();
  const [businesses, setBusinesses] = React.useState<BusinessWithRole[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isCreating, setIsCreating] = React.useState(false);
  const [isSwitchingId, setIsSwitchingId] = React.useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    address_line1: '',
    city: '',
    email: user?.email ?? '',
    name: '',
    phone: user?.phone ?? '',
    pincode: '',
    state: '',
    state_code: '',
  });

  React.useEffect(() => {
    setForm((current) => ({
      ...current,
      email: current.email || user?.email || '',
      phone: current.phone || user?.phone || '',
    }));
  }, [user?.email, user?.phone]);

  React.useEffect(() => {
    let isMounted = true;

    const loadBusinesses = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const items = await businessService.listBusinesses();

        if (!isMounted) {
          return;
        }

        setBusinesses(items);
        setShowCreateForm(items.length === 0);
      } catch (loadError: any) {
        if (!isMounted) {
          return;
        }

        setError(
          loadError?.response?.data?.error?.message ??
            loadError?.response?.data?.message ??
            'Unable to load businesses right now.'
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (isAuthenticated && !session?.business_id) {
      void loadBusinesses();
    }

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, session?.business_id]);

  if (!hasHydrated) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (session?.business_id) {
    return <Redirect href="/(app)" />;
  }

  async function handleSwitchBusiness(businessId: string) {
    setIsSwitchingId(businessId);
    setError(null);

    try {
      const response = await authService.switchBusiness(businessId);

      if (user) {
        setAuth(user, response.tokens, response.session);
      } else {
        setTokens(response.tokens);
        setSession(response.session);
      }
    } catch (switchError: any) {
      setError(
        switchError?.response?.data?.error?.message ??
          switchError?.response?.data?.message ??
          'Unable to switch business right now.'
      );
    } finally {
      setIsSwitchingId(null);
    }
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
      setError('Complete all required business fields first.');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await businessService.createBusiness({
        address_line1: form.address_line1.trim(),
        city: form.city.trim(),
        email: form.email.trim(),
        name: form.name.trim(),
        phone: form.phone.trim(),
        pincode: form.pincode.trim(),
        state: form.state.trim(),
        state_code: form.state_code.trim(),
      });

      if (user) {
        setAuth(user, response.tokens, response.session);
      } else {
        setTokens(response.tokens);
        setSession(response.session);
      }
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
      <View className="absolute -left-12 top-16 h-36 w-36 rounded-full bg-primary/8" />
      <View className="absolute right-0 top-44 h-28 w-28 rounded-full bg-secondary/70" />
      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-6 pb-12 pt-4">
        <View className="gap-6">
          <View className="gap-2">
            <Text className="text-sm uppercase tracking-[2px] text-muted-foreground">Business setup</Text>
            <Text className="text-3xl font-extrabold tracking-tight text-foreground">Create or choose a business</Text>
            <Text className="text-base leading-6 text-muted-foreground">
              You cannot enter the workspace until at least one business is selected.
            </Text>
          </View>

          {error ? (
            <View className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3">
              <Text className="text-sm text-destructive">{error}</Text>
            </View>
          ) : null}

          {isLoading ? (
            <Card className="overflow-hidden rounded-[28px]">
              <View className="absolute -right-12 top-0 h-28 w-28 rounded-full bg-primary/10" />
              <CardContent className="items-center gap-4 py-10">
                <View className="rounded-[24px] bg-primary/10 px-4 py-4">
                  <Icon as={Building2} className="text-primary" size={22} />
                </View>
                <ActivityIndicator />
                <View className="items-center gap-1">
                  <Text className="font-semibold text-foreground">Checking your businesses</Text>
                  <Text className="text-center text-sm leading-5 text-muted-foreground">
                    We&apos;re loading the businesses available for this account before opening the workspace.
                  </Text>
                </View>
              </CardContent>
            </Card>
          ) : null}

          {!isLoading && businesses.length > 0 ? (
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
                    {isSwitchingId === business.id ? (
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
                <CardDescription>Complete the minimum required business details to continue.</CardDescription>
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
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Field label="State">
                      <Input
                        value={form.state}
                        onChangeText={(value) => setForm((current) => ({ ...current, state: value }))}
                      />
                    </Field>
                  </View>
                  <View className="w-24">
                    <Field label="Code">
                      <Input
                        autoCapitalize="characters"
                        maxLength={2}
                        value={form.state_code}
                        onChangeText={(value) => setForm((current) => ({ ...current, state_code: value.toUpperCase() }))}
                      />
                    </Field>
                  </View>
                </View>
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

                <Button className="h-14 gap-2 rounded-[22px]" disabled={isCreating} onPress={handleCreateBusiness}>
                  {isCreating ? <ActivityIndicator color="#ffffff" /> : <>
                    <Icon as={BriefcaseBusiness} className="text-primary-foreground" size={16} />
                    <Text>Create business and continue</Text>
                  </>}
                </Button>
              </CardContent>
            </Card>
          ) : null}
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
