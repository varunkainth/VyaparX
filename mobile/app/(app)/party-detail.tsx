import * as React from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown, Mail, MapPin, PenLine, Phone, Trash2, UserRound } from 'lucide-react-native';

import { INDIAN_STATES, formatStateDisplay } from '@/constants/indian-states';
import { DetailScreenSkeleton } from '@/components/screen-skeleton';
import { SubpageHeader } from '@/components/subpage-header';
import { DevCacheIndicator } from '@/components/dev-cache-indicator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ToastBanner, useTimedToast } from '@/components/ui/toast-banner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { CACHE_TTL_MS, formatCacheAge, isCacheStale } from '@/lib/cache-policy';
import { formatCurrency, formatShortDate } from '@/lib/formatters';
import { useAuthStore } from '@/store/auth-store';
import { usePartyStore } from '@/store/party-store';
import type { OpeningBalanceType, Party, PartyType } from '@/types/party';

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

export default function PartyDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { session } = useAuthStore();
  const deleteParty = usePartyStore((state) => state.deleteParty);
  const ensurePartyDetail = usePartyStore((state) => state.ensurePartyDetail);
  const updateParty = usePartyStore((state) => state.updateParty);
  const { message, showToast } = useTimedToast();
  const [form, setForm] = React.useState<PartyForm | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isStatePickerOpen, setIsStatePickerOpen] = React.useState(false);
  const hasFocusedOnceRef = React.useRef(false);

  const partyId = typeof params.id === 'string' ? params.id : undefined;
  const party = usePartyStore((state) => (partyId ? state.detailById[partyId] ?? null : null));
  const detailError = usePartyStore((state) => (partyId ? state.detailErrorById[partyId] ?? null : null));
  const detailStatus = usePartyStore((state) => (partyId ? state.detailStatusById[partyId] ?? 'idle' : 'idle'));
  const detailUpdatedAt = usePartyStore((state) => (partyId ? state.detailUpdatedAtById[partyId] ?? null : null));
  const partyCacheState =
    detailStatus === 'loading'
      ? 'refreshing'
      : party
        ? isCacheStale(detailUpdatedAt, CACHE_TTL_MS.partyDetail)
          ? 'stale'
          : 'cached'
        : 'empty';

  const loadParty = React.useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (!session?.business_id || !partyId) {
      setError('Missing business or party context.');
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    if (mode === 'initial') {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    try {
      setError(null);
      const nextParty = await ensurePartyDetail(session.business_id, partyId, mode === 'refresh');
      setForm({
        name: nextParty.name,
        party_type: nextParty.party_type === 'both' ? 'customer' : nextParty.party_type,
        gstin: nextParty.gstin ?? '',
        pan: nextParty.pan ?? '',
        phone: normalizePhoneInput(nextParty.phone ?? ''),
        email: nextParty.email ?? '',
        address: nextParty.address ?? '',
        city: nextParty.city ?? '',
        state_code: nextParty.state_code ?? '',
        state: nextParty.state ?? '',
        pincode: nextParty.pincode ?? '',
        opening_balance_type: nextParty.opening_balance_type,
        opening_balance: String(nextParty.opening_balance ?? 0),
        notes: nextParty.notes ?? '',
      });
    } catch (loadError: any) {
      setError(
        loadError?.response?.data?.error?.message ??
          loadError?.response?.data?.message ??
          loadError?.message ??
          'Unable to load the party.',
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [ensurePartyDetail, partyId, session?.business_id]);

  React.useEffect(() => {
    void loadParty();
  }, [loadParty]);

  useFocusEffect(
    React.useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }

      if (!isEditing) {
        void loadParty('refresh');
      }
    }, [isEditing, loadParty]),
  );

  function updateField<Key extends keyof PartyForm>(field: Key, value: PartyForm[Key]) {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  }

  async function onSave() {
    if (!session?.business_id || !party || !form) {
      setError('Missing business or party context.');
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
      const updatedParty = await updateParty(session.business_id, party.id, {
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

      setIsEditing(false);
      showToast(`${updatedParty.name} updated successfully.`);
      setTimeout(() => {
        router.replace({
          pathname: '/(app)/customers',
          params: { refresh: String(Date.now()), toast: `${updatedParty.name} updated successfully.` },
        });
      }, 450);
    } catch (submitError: any) {
      setError(
        submitError?.response?.data?.error?.message ??
          submitError?.response?.data?.message ??
          submitError?.message ??
          'Unable to update the party.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onDelete() {
    if (!session?.business_id || !party) {
      setError('Missing business or party context.');
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await deleteParty(session.business_id, party.id);
      setIsDeleteDialogOpen(false);
      showToast(`${party.name} deleted successfully.`);
      setTimeout(() => {
        router.replace({
          pathname: '/(app)/customers',
          params: { refresh: String(Date.now()), toast: `${party.name} deleted successfully.` },
        });
      }, 450);
    } catch (deleteError: any) {
      setError(
        deleteError?.response?.data?.error?.message ??
          deleteError?.response?.data?.message ??
          deleteError?.message ??
          'Unable to delete the party.',
      );
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading || !party || !form) {
    return <DetailScreenSkeleton rowCount={3} />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-6 pb-28 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              if (!isEditing) {
                void loadParty('refresh');
              }
            }}
          />
        }>
        <View className="gap-6">
          <SubpageHeader
            backHref="/(app)/customers"
            eyebrow="Parties"
            subtitle="View and manage the full customer or supplier record from mobile."
            title={party.name}
          />
          <DevCacheIndicator
            label="party"
            state={partyCacheState}
            detail={formatCacheAge(detailUpdatedAt)}
          />

          {!isEditing ? (
            <>
              <Card className="rounded-[28px]">
                <CardHeader>
                  <CardTitle>Overview</CardTitle>
                  <CardDescription>Current balance, type, and party activity basics.</CardDescription>
                </CardHeader>
                <CardContent className="gap-3">
                  <InfoRow label="Party type" value={party.party_type === 'both' ? 'Customer and supplier' : party.party_type} />
                  <InfoRow label="Current balance" value={formatCurrency(party.current_balance)} />
                  <InfoRow label="Opening balance" value={`${formatCurrency(party.opening_balance)} | ${party.opening_balance_type}`} />
                  <InfoRow label="Created" value={formatShortDate(party.created_at)} />
                </CardContent>
              </Card>

              <Card className="rounded-[28px]">
                <CardHeader>
                  <CardTitle>Contact and address</CardTitle>
                </CardHeader>
                <CardContent className="gap-3">
                  <InfoRow icon={Phone} label="Phone" value={party.phone || 'Not added'} />
                  <InfoRow icon={Mail} label="Email" value={party.email || 'Not added'} />
                  <InfoRow icon={MapPin} label="City" value={party.city || 'Not added'} />
                  <InfoRow label="Address" value={party.address || 'Not added'} />
                  <InfoRow label="State" value={party.state ? `${party.state_code} - ${party.state}` : 'Not added'} />
                </CardContent>
              </Card>

              <Card className="rounded-[28px]">
                <CardHeader>
                  <CardTitle>Tax and notes</CardTitle>
                </CardHeader>
                <CardContent className="gap-3">
                  <InfoRow label="GSTIN" value={party.gstin || 'Not added'} />
                  <InfoRow label="PAN" value={party.pan || 'Not added'} />
                  <InfoRow label="Notes" value={party.notes || 'No notes added'} />
                </CardContent>
              </Card>

              <Button className="h-14 rounded-[24px]" onPress={() => setIsEditing(true)}>
                <Icon as={PenLine} className="text-primary-foreground" size={18} />
                <Text className="text-base">Edit party</Text>
              </Button>

              <Button className="mb-4 h-14 rounded-[24px]" variant="destructive" disabled={isDeleting} onPress={() => setIsDeleteDialogOpen(true)}>
                {isDeleting ? (
                  <>
                    <ActivityIndicator color="#ffffff" />
                    <Text className="text-base">Deleting party...</Text>
                  </>
                ) : (
                  <>
                    <Icon as={Trash2} className="text-white" size={18} />
                    <Text className="text-base">Delete party</Text>
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Card className="rounded-[28px]">
                <CardHeader>
                  <CardTitle>Edit party</CardTitle>
                  <CardDescription>Update the relationship, contact, and balance settings for this party.</CardDescription>
                </CardHeader>
                <CardContent className="gap-5">
                  <Field label="Party name" required>
                    <Input value={form.name} onChangeText={(value) => updateField('name', value)} />
                  </Field>
                  <Field label="Party type" required>
                    <View className="flex-row gap-3">
                      <ChoiceChip label="Customer" selected={form.party_type === 'customer'} onPress={() => updateField('party_type', 'customer')} />
                      <ChoiceChip label="Supplier" selected={form.party_type === 'supplier'} onPress={() => updateField('party_type', 'supplier')} />
                    </View>
                  </Field>
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

              {error || detailError ? (
                <View className="rounded-[24px] border border-destructive/30 bg-destructive/10 px-4 py-4">
                  <Text className="text-sm text-destructive">{error ?? detailError}</Text>
                </View>
              ) : null}

              <View className="mb-4 flex-row gap-3">
                <Button className="h-14 flex-1 rounded-[24px]" variant="outline" onPress={() => setIsEditing(false)}>
                  <Text className="text-base">Cancel</Text>
                </Button>
                <Button className="h-14 flex-1 rounded-[24px]" disabled={isSubmitting} onPress={onSave}>
                  {isSubmitting ? (
                    <>
                      <ActivityIndicator color="#ffffff" />
                      <Text className="text-base">Saving...</Text>
                    </>
                  ) : (
                    <>
                      <Icon as={PenLine} className="text-primary-foreground" size={18} />
                      <Text className="text-base">Save party</Text>
                    </>
                  )}
                </Button>
              </View>
            </>
          )}
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
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[28px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete party?</AlertDialogTitle>
            <AlertDialogDescription>This will deactivate the party record for this business. Continue only if you are sure.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Text>Cancel</Text>
            </AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onPress={onDelete}>
              <Text className="text-white">Delete party</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ToastBanner message={message} variant="success" />
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon?: typeof Phone;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-start gap-3 rounded-2xl border border-border/70 bg-background px-4 py-4">
      <View className="rounded-2xl bg-primary/10 px-3 py-3">
        <Icon as={icon ?? UserRound} className="text-primary" size={18} />
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-sm text-muted-foreground">{label}</Text>
        <Text className="font-semibold text-foreground">{value}</Text>
      </View>
    </View>
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
  icon: typeof MapPin;
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
