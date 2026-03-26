import * as React from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SubpageHeader } from '@/components/subpage-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { businessService } from '@/services/business.service';
import { useAuthStore } from '@/store/auth-store';
import type { CreateBusinessInput } from '@/types/business';

const initialForm: CreateBusinessInput = {
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

export default function BusinessSettingsScreen() {
  const { session } = useAuthStore();
  const [form, setForm] = React.useState<CreateBusinessInput>(initialForm);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    const loadBusiness = async () => {
      if (!session?.business_id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const business = await businessService.getBusiness(session.business_id);

        if (!isMounted) {
          return;
        }

        setForm({
          ...initialForm,
          address_line1: business.address_line1 ?? '',
          address_line2: business.address_line2 ?? '',
          bank_account_no: business.bank_account_no ?? '',
          bank_branch: business.bank_branch ?? '',
          bank_ifsc: business.bank_ifsc ?? '',
          bank_name: business.bank_name ?? '',
          city: business.city ?? '',
          email: business.email ?? '',
          gstin: business.gstin ?? '',
          invoice_prefix: business.invoice_prefix ?? '',
          name: business.name ?? '',
          pan: business.pan ?? '',
          phone: business.phone ?? '',
          pincode: business.pincode ?? '',
          state: business.state ?? '',
          state_code: business.state_code ?? '',
          upi_id: business.upi_id ?? '',
          website: business.website ?? '',
        });
      } catch (loadError: any) {
        if (!isMounted) {
          return;
        }

        setError(
          loadError?.response?.data?.error?.message ??
            loadError?.response?.data?.message ??
            'Unable to load business settings right now.'
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadBusiness();

    return () => {
      isMounted = false;
    };
  }, [session?.business_id]);

  async function onSave() {
    if (!session?.business_id) {
      setError('No active business selected.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await businessService.updateBusiness(session.business_id, {
        address_line1: form.address_line1.trim() || undefined,
        address_line2: form.address_line2?.trim() || undefined,
        bank_account_no: form.bank_account_no?.trim() || undefined,
        bank_branch: form.bank_branch?.trim() || undefined,
        bank_ifsc: form.bank_ifsc?.trim() || undefined,
        bank_name: form.bank_name?.trim() || undefined,
        city: form.city.trim() || undefined,
        email: form.email.trim() || undefined,
        gstin: form.gstin?.trim() || undefined,
        invoice_prefix: form.invoice_prefix?.trim() || undefined,
        name: form.name.trim() || undefined,
        pan: form.pan?.trim() || undefined,
        phone: form.phone.trim() || undefined,
        pincode: form.pincode.trim() || undefined,
        state: form.state.trim() || undefined,
        state_code: form.state_code.trim().toUpperCase() || undefined,
        upi_id: form.upi_id?.trim() || undefined,
        website: form.website?.trim() || undefined,
      });

      setSuccessMessage('Business settings updated successfully.');
    } catch (saveError: any) {
      setError(
        saveError?.response?.data?.error?.message ??
          saveError?.response?.data?.message ??
          'Unable to save business settings right now.'
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-6 pb-28 pt-4">
        <View className="gap-6">
          <SubpageHeader
            backHref="/(app)/business"
            eyebrow="Business settings"
            subtitle="Update the selected workspace details, invoice defaults, and banking setup."
            title="Manage business setup"
          />

          {error ? (
            <View className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3">
              <Text className="text-sm text-destructive">{error}</Text>
            </View>
          ) : null}

          {successMessage ? (
            <View className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3">
              <Text className="text-sm text-foreground">{successMessage}</Text>
            </View>
          ) : null}

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Business profile</CardTitle>
              <CardDescription>Core identity and registration details for this workspace.</CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              {isLoading ? (
                <View className="items-center py-8">
                  <ActivityIndicator />
                </View>
              ) : (
                <>
                  <BusinessField label="Business name">
                    <Input value={form.name} onChangeText={(value) => setForm((current) => ({ ...current, name: value }))} />
                  </BusinessField>
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <BusinessField label="GSTIN">
                        <Input value={form.gstin} onChangeText={(value) => setForm((current) => ({ ...current, gstin: value }))} />
                      </BusinessField>
                    </View>
                    <View className="flex-1">
                      <BusinessField label="PAN">
                        <Input value={form.pan} onChangeText={(value) => setForm((current) => ({ ...current, pan: value }))} />
                      </BusinessField>
                    </View>
                  </View>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Address and contact</CardTitle>
              <CardDescription>Location and communication details used across invoices and documents.</CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              <BusinessField label="Address line 1">
                <Input value={form.address_line1} onChangeText={(value) => setForm((current) => ({ ...current, address_line1: value }))} />
              </BusinessField>
              <BusinessField label="Address line 2">
                <Input value={form.address_line2} onChangeText={(value) => setForm((current) => ({ ...current, address_line2: value }))} />
              </BusinessField>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <BusinessField label="City">
                    <Input value={form.city} onChangeText={(value) => setForm((current) => ({ ...current, city: value }))} />
                  </BusinessField>
                </View>
                <View className="flex-1">
                  <BusinessField label="State">
                    <Input value={form.state} onChangeText={(value) => setForm((current) => ({ ...current, state: value }))} />
                  </BusinessField>
                </View>
              </View>
              <View className="flex-row gap-3">
                <View className="w-24">
                  <BusinessField label="Code">
                    <Input
                      autoCapitalize="characters"
                      maxLength={2}
                      value={form.state_code}
                      onChangeText={(value) => setForm((current) => ({ ...current, state_code: value.toUpperCase() }))}
                    />
                  </BusinessField>
                </View>
                <View className="flex-1">
                  <BusinessField label="Pincode">
                    <Input
                      keyboardType="number-pad"
                      value={form.pincode}
                      onChangeText={(value) => setForm((current) => ({ ...current, pincode: value }))}
                    />
                  </BusinessField>
                </View>
              </View>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <BusinessField label="Phone">
                    <Input
                      keyboardType="phone-pad"
                      value={form.phone}
                      onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))}
                    />
                  </BusinessField>
                </View>
                <View className="flex-1">
                  <BusinessField label="Email">
                    <Input
                      autoCapitalize="none"
                      keyboardType="email-address"
                      value={form.email}
                      onChangeText={(value) => setForm((current) => ({ ...current, email: value }))}
                    />
                  </BusinessField>
                </View>
              </View>
              <BusinessField label="Website">
                <Input
                  autoCapitalize="none"
                  keyboardType="url"
                  value={form.website}
                  onChangeText={(value) => setForm((current) => ({ ...current, website: value }))}
                />
              </BusinessField>
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Invoice and banking</CardTitle>
              <CardDescription>Invoice prefix, bank details, and UPI details for customer-facing documents.</CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              <BusinessField label="Invoice prefix">
                <Input
                  value={form.invoice_prefix}
                  onChangeText={(value) => setForm((current) => ({ ...current, invoice_prefix: value }))}
                />
              </BusinessField>
              <BusinessField label="Bank name">
                <Input value={form.bank_name} onChangeText={(value) => setForm((current) => ({ ...current, bank_name: value }))} />
              </BusinessField>
              <BusinessField label="Bank account number">
                <Input
                  keyboardType="number-pad"
                  value={form.bank_account_no}
                  onChangeText={(value) => setForm((current) => ({ ...current, bank_account_no: value }))}
                />
              </BusinessField>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <BusinessField label="IFSC">
                    <Input
                      autoCapitalize="characters"
                      value={form.bank_ifsc}
                      onChangeText={(value) => setForm((current) => ({ ...current, bank_ifsc: value.toUpperCase() }))}
                    />
                  </BusinessField>
                </View>
                <View className="flex-1">
                  <BusinessField label="Branch">
                    <Input
                      value={form.bank_branch}
                      onChangeText={(value) => setForm((current) => ({ ...current, bank_branch: value }))}
                    />
                  </BusinessField>
                </View>
              </View>
              <BusinessField label="UPI ID">
                <Input value={form.upi_id} onChangeText={(value) => setForm((current) => ({ ...current, upi_id: value }))} />
              </BusinessField>
              <Button className="h-14 rounded-[22px]" disabled={isSaving || isLoading} onPress={onSave}>
                {isSaving ? <ActivityIndicator color="#ffffff" /> : <Text>Save business settings</Text>}
              </Button>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
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
