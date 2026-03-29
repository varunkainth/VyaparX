import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Building2, ChevronDown, MapPin, Save, UserPlus } from 'lucide-react-native';

import { INDIAN_STATES, formatStateDisplay } from '@/constants/indian-states';
import { SubpageHeader } from '@/components/subpage-header';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ToastBanner, useTimedToast } from '@/components/ui/toast-banner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { partyService } from '@/services/party.service';
import { useAuthStore } from '@/store/auth-store';
import type { OpeningBalanceType, PartyType } from '@/types/party';

type PartyForm = {
  name: string;
  party_type: PartyType;
  gstin: string;
  pan: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state_code: string;
  state: string;
  pincode: string;
  opening_balance_type: OpeningBalanceType;
  opening_balance: string;
  notes: string;
};

const INITIAL_FORM: PartyForm = {
  name: '',
  party_type: 'customer',
  gstin: '',
  pan: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state_code: '',
  state: '',
  pincode: '',
  opening_balance_type: 'none',
  opening_balance: '',
  notes: '',
};

export default function PartyCreateScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const { message, showToast } = useTimedToast();
  const [form, setForm] = React.useState<PartyForm>(INITIAL_FORM);
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isStatePickerOpen, setIsStatePickerOpen] = React.useState(false);

  function updateField<Key extends keyof PartyForm>(field: Key, value: PartyForm[Key]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function onSubmit() {
    if (!session?.business_id) {
      setError('No active business found for party creation.');
      return;
    }

    if (form.name.trim().length < 2) {
      setError('Party name must be at least 2 characters.');
      return;
    }

    if (!form.address.trim()) {
      setError('Street address is required.');
      return;
    }

    if (form.party_type === 'both') {
      setError('A party cannot be both customer and supplier in the mobile app.');
      return;
    }

    const normalizedPhone = normalizePhoneInput(form.phone);
    if (normalizedPhone && normalizedPhone.length !== 10) {
      setError('Phone number must be exactly 10 digits and cannot start with 0.');
      return;
    }

    const normalizedEmail = normalizeOptional(form.email);
    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    const openingBalance =
      form.opening_balance_type === 'none' || !form.opening_balance.trim()
        ? undefined
        : Number(form.opening_balance);

    if (openingBalance != null && (Number.isNaN(openingBalance) || openingBalance < 0)) {
      setError('Opening balance must be a valid non-negative number.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const createdParty = await partyService.createParty(session.business_id, {
        name: form.name.trim(),
        party_type: form.party_type,
        gstin: normalizeOptional(form.gstin),
        pan: normalizeOptional(form.pan),
        phone: normalizedPhone || undefined,
        email: normalizedEmail,
        address: form.address.trim(),
        city: normalizeOptional(form.city),
        state_code: normalizeOptional(form.state_code),
        state: normalizeOptional(form.state),
        pincode: normalizeOptional(form.pincode),
        opening_balance: openingBalance,
        opening_balance_type: form.opening_balance_type,
        notes: normalizeOptional(form.notes),
      });

      showToast(`${createdParty.name} created successfully.`);
      setTimeout(() => {
        router.replace({
          pathname: '/(app)/customers',
          params: { refresh: String(Date.now()), toast: `${createdParty.name} created successfully.` },
        });
      }, 450);
    } catch (submitError: any) {
      setError(
        submitError?.response?.data?.error?.message ??
          submitError?.response?.data?.message ??
          submitError?.message ??
          'Unable to create the party.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-6 pb-28 pt-4">
        <View className="gap-6">
          <SubpageHeader
            backHref="/(app)/customers"
            eyebrow="Parties"
            subtitle="Create a customer, supplier, or shared party record with contact and balance details."
            title="Add party"
          />

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Basic details</CardTitle>
              <CardDescription>Start with the party name and relationship type.</CardDescription>
            </CardHeader>
            <CardContent className="gap-5">
              <Field label="Party name" required>
                <Input placeholder="Aditi Traders" value={form.name} onChangeText={(value) => updateField('name', value)} />
              </Field>
              <Field label="Party type" required>
                <View className="flex-row gap-3">
                  <ChoiceChip label="Customer" selected={form.party_type === 'customer'} onPress={() => updateField('party_type', 'customer')} />
                  <ChoiceChip label="Supplier" selected={form.party_type === 'supplier'} onPress={() => updateField('party_type', 'supplier')} />
                </View>
              </Field>
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Contact and tax</CardTitle>
              <CardDescription>Store the basic identity and compliance fields for this party.</CardDescription>
            </CardHeader>
            <CardContent className="gap-5">
              <View className="flex-row gap-4">
                <Field className="flex-1" label="Phone">
                  <Input keyboardType="phone-pad" value={form.phone} onChangeText={(value) => updateField('phone', normalizePhoneInput(value))} />
                </Field>
                <Field className="flex-1" label="Email">
                  <Input keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={(value) => updateField('email', value)} />
                </Field>
              </View>
              <Field label="GSTIN">
                <Input autoCapitalize="characters" value={form.gstin} onChangeText={(value) => updateField('gstin', value.toUpperCase())} />
              </Field>
              <Field label="PAN">
                <Input autoCapitalize="characters" value={form.pan} onChangeText={(value) => updateField('pan', value.toUpperCase())} />
              </Field>
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Address</CardTitle>
              <CardDescription>Add location details for billing and reference.</CardDescription>
            </CardHeader>
            <CardContent className="gap-5">
              <Field label="Street address" required>
                <Input value={form.address} onChangeText={(value) => updateField('address', value)} />
              </Field>
              <View className="flex-row gap-4">
                <Field className="flex-1" label="City">
                  <Input value={form.city} onChangeText={(value) => updateField('city', value)} />
                </Field>
                <Field className="flex-1" label="Pincode">
                  <Input keyboardType="number-pad" value={form.pincode} onChangeText={(value) => updateField('pincode', value)} />
                </Field>
              </View>
              <Field label="State">
                <SelectionCard
                  icon={MapPin}
                  label="Select state"
                  value={form.state_code ? formatStateDisplay({ code: form.state_code, name: form.state, type: 'state' as const }) : 'Choose state'}
                  onPress={() => setIsStatePickerOpen(true)}
                />
              </Field>
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Opening balance</CardTitle>
              <CardDescription>Set an optional starting payable or receivable amount.</CardDescription>
            </CardHeader>
            <CardContent className="gap-5">
              <Field label="Balance type">
                <View className="flex-row gap-3">
                  <ChoiceChip label="None" selected={form.opening_balance_type === 'none'} onPress={() => updateField('opening_balance_type', 'none')} />
                  <ChoiceChip label="Receivable" selected={form.opening_balance_type === 'receivable'} onPress={() => updateField('opening_balance_type', 'receivable')} />
                  <ChoiceChip label="Payable" selected={form.opening_balance_type === 'payable'} onPress={() => updateField('opening_balance_type', 'payable')} />
                </View>
              </Field>
              {form.opening_balance_type !== 'none' ? (
                <Field label="Opening amount">
                  <Input keyboardType="decimal-pad" value={form.opening_balance} onChangeText={(value) => updateField('opening_balance', value)} />
                </Field>
              ) : null}
              <Field label="Notes">
                <Textarea className="min-h-[110px] rounded-[22px] border-border/70 bg-muted/35 px-4 py-3" value={form.notes} onChangeText={(value) => updateField('notes', value)} />
              </Field>
            </CardContent>
          </Card>

          {error ? (
            <View className="rounded-[24px] border border-destructive/30 bg-destructive/10 px-4 py-4">
              <Text className="text-sm text-destructive">{error}</Text>
            </View>
          ) : null}

          <Button className="mb-4 h-14 rounded-[24px]" disabled={isSubmitting} onPress={onSubmit}>
            {isSubmitting ? (
              <>
                <ActivityIndicator color="#ffffff" />
                <Text className="text-base">Creating party...</Text>
              </>
            ) : (
              <>
                <Icon as={UserPlus} className="text-primary-foreground" size={18} />
                <Text className="text-base">Create party</Text>
              </>
            )}
          </Button>
        </View>
      </ScrollView>
      <Dialog open={isStatePickerOpen} onOpenChange={setIsStatePickerOpen}>
        <DialogContent className="max-w-[420px] rounded-[28px]">
          <DialogHeader>
            <DialogTitle>Select state</DialogTitle>
            <DialogDescription>Choose the party’s billing state.</DialogDescription>
          </DialogHeader>
          <ScrollView className="max-h-[360px]">
            <View className="gap-3">
              {INDIAN_STATES.map((state) => (
                <PickerOption
                  key={state.code}
                  title={formatStateDisplay(state)}
                  selected={form.state_code === state.code}
                  onPress={() => {
                    updateField('state_code', state.code);
                    updateField('state', state.name);
                    setIsStatePickerOpen(false);
                  }}
                />
              ))}
            </View>
          </ScrollView>
        </DialogContent>
      </Dialog>
      <ToastBanner message={message} variant="success" />
    </SafeAreaView>
  );
}

function Field({
  children,
  className,
  label,
  required,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <View className={className}>
      <View className="gap-2">
        <Label>
          {label}
          {required ? <Text className="text-destructive"> *</Text> : null}
        </Label>
        {children}
      </View>
    </View>
  );
}

function ChoiceChip({ label, onPress, selected }: { label: string; onPress: () => void; selected: boolean }) {
  return (
    <Pressable className={`flex-1 items-center rounded-[22px] border px-4 py-3 ${selected ? 'border-primary bg-primary' : 'border-border/70 bg-background'}`} onPress={onPress}>
      <Text className={selected ? 'text-primary-foreground' : 'text-foreground'}>{label}</Text>
    </Pressable>
  );
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
    <Pressable className="flex-row items-center gap-4 rounded-[24px] border border-border/70 bg-background px-4 py-4" onPress={onPress}>
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

function PickerOption({ onPress, selected, title }: { onPress: () => void; selected: boolean; title: string }) {
  return (
    <Pressable className={`rounded-[22px] border px-4 py-4 ${selected ? 'border-primary bg-primary/10' : 'border-border/70 bg-background'}`} onPress={onPress}>
      <Text className="font-semibold text-foreground">{title}</Text>
    </Pressable>
  );
}

function normalizeOptional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function normalizePhoneInput(value: string) {
  return value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 10);
}
