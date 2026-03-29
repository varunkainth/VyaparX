import * as React from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Platform, Pressable, ScrollView, View } from 'react-native';
import { Bell, CheckCircle2, ChevronRight, Fingerprint, Info, LockKeyhole, MoonStar, Smartphone, SunMedium, Trash2, Wallet, AlertTriangle, Package, type LucideIcon } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Passkey } from 'react-native-passkey';

import { SubpageHeader } from '@/components/subpage-header';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { ToastBanner, useTimedToast } from '@/components/ui/toast-banner';
import { authService, type PasskeyCredential } from '@/services/auth.service';
import { useNotifications } from '@/hooks/use-notifications';
import { useAuthStore } from '@/store/auth-store';
import { useAppTheme } from '@/theme/theme-provider';

const themeOptions = [
  { description: 'Follow the device preference automatically.', icon: Smartphone, key: 'system', label: 'System' },
  { description: 'Bright interface for daytime usage.', icon: SunMedium, key: 'light', label: 'Light' },
  { description: 'Darker interface for lower glare.', icon: MoonStar, key: 'dark', label: 'Dark' },
] as const;

const criticalCategories = ['out_of_stock', 'low_stock', 'invoice_overdue', 'payment_due'] as const;
const updateCategories = ['payment_received', 'stock_alert', 'system', 'info'] as const;

function isCriticalNotificationType(value: string): value is (typeof criticalCategories)[number] {
  return criticalCategories.includes(value as (typeof criticalCategories)[number]);
}

function isUpdateNotificationType(value: string): value is (typeof updateCategories)[number] {
  return updateCategories.includes(value as (typeof updateCategories)[number]);
}

export default function SettingsScreen() {
  const router = useRouter();
  const { clearAuth } = useAuthStore();
  const { message, showToast } = useTimedToast();
  const { resolvedTheme, setThemeMode, themeMode } = useAppTheme();
  const { preferences, updatePreferences } = useNotifications();
  const [passkeys, setPasskeys] = React.useState<PasskeyCredential[]>([]);
  const [isPasskeysLoading, setIsPasskeysLoading] = React.useState(true);
  const [isDeletingId, setIsDeletingId] = React.useState<string | null>(null);
  const [isRegisteringPasskey, setIsRegisteringPasskey] = React.useState(false);
  const [pendingDeletePasskey, setPendingDeletePasskey] = React.useState<PasskeyCredential | null>(null);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const notificationTypes = [
    { key: 'out_of_stock' as const, label: 'Out of stock', description: 'Alert when an item reaches zero stock.', icon: AlertTriangle },
    { key: 'low_stock' as const, label: 'Low stock', description: 'Alert when an item falls below threshold.', icon: AlertTriangle },
    { key: 'invoice_overdue' as const, label: 'Overdue invoices', description: 'Show reminders for overdue invoices.', icon: Info },
    { key: 'payment_due' as const, label: 'Pending payments', description: 'Show reminders for pending payment follow-up.', icon: Wallet },
    { key: 'payment_received' as const, label: 'Payment received', description: 'Notify when money is received.', icon: CheckCircle2 },
    { key: 'stock_alert' as const, label: 'Stock alerts', description: 'General stock-related notifications.', icon: Package },
    { key: 'system' as const, label: 'System', description: 'Important system messages.', icon: Bell },
    { key: 'info' as const, label: 'Information', description: 'General informational updates.', icon: Info },
  ];
  const enabledCategories = notificationTypes.filter((item) => preferences.types[item.key]).length;
  const criticalEnabled = criticalCategories.filter((key) => preferences.types[key]).length;
  const updatesEnabled = updateCategories.filter((key) => preferences.types[key]).length;

  React.useEffect(() => {
    let isMounted = true;

    const loadPasskeys = async () => {
      setIsPasskeysLoading(true);

      try {
        const items = await authService.listPasskeys();

        if (!isMounted) {
          return;
        }

        setPasskeys(items);
      } catch {
        if (!isMounted) {
          return;
        }

        setPasskeys([]);
      } finally {
        if (isMounted) {
          setIsPasskeysLoading(false);
        }
      }
    };

    void loadPasskeys();

    return () => {
      isMounted = false;
    };
  }, []);

  async function onChangePassword() {
    if (!currentPassword.trim() || !newPassword.trim()) {
      setError('Enter your current password and a new password.');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await authService.changePassword({
        currentPassword,
        newPassword,
      });

      await clearAuth();
      router.replace('/(auth)/login');
    } catch (submitError: any) {
      setError(
        submitError?.response?.data?.error?.message ??
          submitError?.response?.data?.message ??
          'Unable to change password. Try again.'
      );
      setIsSubmitting(false);
      return;
    }

    setSuccessMessage('Password changed. Please sign in again with the new password.');
    setCurrentPassword('');
    setNewPassword('');
    setIsSubmitting(false);
  }

  async function onDeletePasskey(credentialId: string) {
    setIsDeletingId(credentialId);
    setError(null);
    setSuccessMessage(null);

    try {
      await authService.deletePasskey(credentialId);
      setPasskeys((current) => current.filter((passkey) => passkey.credential_id !== credentialId));
      setSuccessMessage('Passkey removed successfully.');
      showToast('Passkey removed successfully.');
    } catch (deleteError: any) {
      setError(
        deleteError?.response?.data?.error?.message ??
          deleteError?.response?.data?.message ??
          'Unable to remove passkey right now.'
      );
    } finally {
      setIsDeletingId(null);
      setPendingDeletePasskey(null);
    }
  }

  async function onRegisterPasskey() {
    if (!Passkey.isSupported()) {
      setError('Passkeys require a supported device and a development or production build, not Expo Go.');
      return;
    }

    setIsRegisteringPasskey(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const options = await authService.beginPasskeyRegistration();
      const response = await Passkey.create(options);
      const credential = await authService.verifyPasskeyRegistration({
        label: buildPasskeyLabel(),
        response,
      });

      setPasskeys((current) => [credential, ...current.filter((item) => item.credential_id !== credential.credential_id)]);
      setSuccessMessage('Passkey registered successfully.');
      showToast('Passkey registered successfully.');
    } catch (registerError: any) {
      setError(
        registerError?.response?.data?.error?.message ??
          registerError?.response?.data?.message ??
          registerError?.message ??
          'Unable to register passkey right now.'
      );
    } finally {
      setIsRegisteringPasskey(false);
    }
  }

  async function onToggleNotifications(enabled: boolean) {
    setError(null);
    setSuccessMessage(null);
    await updatePreferences({ ...preferences, enabled });
    setSuccessMessage(enabled ? 'Notifications enabled.' : 'Notifications disabled.');
    showToast(enabled ? 'Notifications enabled.' : 'Notifications disabled.');
  }

  async function onToggleNotificationType(
    key: keyof typeof preferences.types,
    enabled: boolean,
  ) {
    setError(null);
    setSuccessMessage(null);
    await updatePreferences({
      ...preferences,
      types: { ...preferences.types, [key]: enabled },
    });
    showToast(`${notificationTypes.find((item) => item.key === key)?.label ?? 'Notification'} ${enabled ? 'enabled' : 'disabled'}.`);
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-6 pb-28 pt-4">
        <View className="gap-6">
          <SubpageHeader
            backHref="/(app)/more"
            eyebrow="Settings"
            subtitle="Control appearance and security for the mobile app."
            title="App preferences"
          />

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>Switch the app appearance without leaving the current session.</CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              {themeOptions.map((option) => {
                const isActive = themeMode === option.key;

                return (
                  <Pressable
                    key={option.key}
                    accessibilityLabel={`Use ${option.label} theme`}
                    accessibilityRole="button"
                    className={`rounded-[24px] border px-4 py-4 ${
                      isActive ? 'border-primary bg-primary/10' : 'border-border/70 bg-background'
                    }`}
                    onPress={() => setThemeMode(option.key)}>
                    <View className="flex-row items-center gap-4">
                      <View className={`rounded-2xl px-3 py-3 ${isActive ? 'bg-primary' : 'bg-primary/10'}`}>
                        <Icon
                          as={option.icon}
                          className={isActive ? 'text-primary-foreground' : 'text-primary'}
                          size={18}
                        />
                      </View>
                      <View className="flex-1 gap-1">
                        <Text className="font-semibold text-foreground">{option.label}</Text>
                        <Text className="text-sm leading-5 text-muted-foreground">{option.description}</Text>
                      </View>
                      <View className={`h-3 w-3 rounded-full ${isActive ? 'bg-primary' : 'bg-border'}`} />
                    </View>
                  </Pressable>
                );
              })}
              <Text className="text-sm text-muted-foreground">Current resolved appearance: {resolvedTheme}</Text>
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Change the account password using the backend auth endpoint.</CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              <View className="gap-2">
                <Label htmlFor="currentPassword">Current password</Label>
                <View className="flex-row items-center gap-3 rounded-[22px] border border-border/70 bg-muted/35 px-4">
                  <Icon as={LockKeyhole} className="text-muted-foreground" size={18} />
                  <Input
                    id="currentPassword"
                    className="h-14 flex-1 rounded-none border-0 bg-transparent px-0 text-base shadow-none"
                    onChangeText={setCurrentPassword}
                    secureTextEntry
                    value={currentPassword}
                  />
                </View>
              </View>

              <View className="gap-2">
                <Label htmlFor="newPassword">New password</Label>
                <View className="flex-row items-center gap-3 rounded-[22px] border border-border/70 bg-muted/35 px-4">
                  <Icon as={LockKeyhole} className="text-muted-foreground" size={18} />
                  <Input
                    id="newPassword"
                    className="h-14 flex-1 rounded-none border-0 bg-transparent px-0 text-base shadow-none"
                    onChangeText={setNewPassword}
                    secureTextEntry
                    value={newPassword}
                  />
                </View>
              </View>

              {error ? (
                <View className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-3">
                  <Text className="text-sm text-destructive">{error}</Text>
                </View>
              ) : null}

              {successMessage ? (
                <View className="rounded-2xl border border-primary/20 bg-primary/10 px-3 py-3">
                  <Text className="text-sm text-foreground">{successMessage}</Text>
                </View>
              ) : null}

              <Button className="h-14 rounded-[22px]" disabled={isSubmitting} onPress={onChangePassword}>
                {isSubmitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-base">Change password</Text>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Control which backend alerts appear inside the mobile app.</CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              <View className="overflow-hidden rounded-[28px] border border-border/70 bg-background">
                <View className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10" />
                <View className="gap-4 px-4 py-4">
                  <View className="flex-row items-center gap-4">
                    <View className="rounded-2xl bg-primary px-3 py-3">
                      <Icon as={Bell} className="text-primary-foreground" size={18} />
                    </View>
                    <View className="flex-1 gap-1">
                      <Text className="font-semibold text-foreground">In-app alerts</Text>
                      <Text className="text-sm leading-5 text-muted-foreground">
                        Keep business alerts visible across Home, notifications, and reminders.
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      className={`rounded-full px-3 py-1.5 ${preferences.enabled ? 'bg-primary' : 'bg-muted'}`}
                      onPress={() => void onToggleNotifications(!preferences.enabled)}>
                      <Text className={preferences.enabled ? 'text-primary-foreground' : 'text-muted-foreground'}>
                        {preferences.enabled ? 'On' : 'Off'}
                      </Text>
                    </Pressable>
                  </View>

                  <View className="flex-row gap-3">
                    <View className="flex-1 rounded-2xl border border-border/70 bg-card px-4 py-3">
                      <Text className="text-xs uppercase tracking-[1px] text-muted-foreground">Enabled</Text>
                      <Text className="mt-1 text-xl font-bold text-foreground">
                        {preferences.enabled ? `${enabledCategories}/8` : '0/8'}
                      </Text>
                    </View>
                    <View className="flex-1 rounded-2xl border border-border/70 bg-card px-4 py-3">
                      <Text className="text-xs uppercase tracking-[1px] text-muted-foreground">Critical</Text>
                      <Text className="mt-1 text-xl font-bold text-foreground">
                        {preferences.enabled ? `${criticalEnabled}/4` : '0/4'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                className="flex-row items-center justify-between rounded-[24px] border border-border/70 bg-card px-4 py-4"
                onPress={() => router.push('/(app)/notifications')}>
                <View className="flex-row items-center gap-4">
                  <View className="rounded-2xl bg-primary/10 px-3 py-3">
                    <Icon as={Bell} className="text-primary" size={18} />
                  </View>
                  <View className="flex-1 gap-1">
                    <Text className="font-semibold text-foreground">Open alerts center</Text>
                    <Text className="text-sm leading-5 text-muted-foreground">
                      Review unread notifications and manage them in one place.
                    </Text>
                  </View>
                  <Icon as={ChevronRight} className="text-muted-foreground" size={18} />
                </View>
              </Pressable>

              {preferences.enabled
                ? (
                    <View className="gap-3">
                      <Text className="text-xs uppercase tracking-[1px] text-muted-foreground">Alert categories</Text>
                      <PreferenceGroup
                        description="Stock and collections warnings that usually need action."
                        title="Critical alerts"
                      >
                        {notificationTypes
                          .filter((item) => isCriticalNotificationType(item.key))
                          .map((item) => (
                            <PreferenceRow
                              key={item.key}
                              description={item.description}
                              enabled={preferences.types[item.key]}
                              icon={item.icon}
                              label={item.label}
                              onPress={() => void onToggleNotificationType(item.key, !preferences.types[item.key])}
                            />
                          ))}
                      </PreferenceGroup>

                      <PreferenceGroup
                        description="Operational updates that help with awareness but are less urgent."
                        title="Updates and system"
                      >
                        {notificationTypes
                          .filter((item) => isUpdateNotificationType(item.key))
                          .map((item) => (
                            <PreferenceRow
                              key={item.key}
                              description={item.description}
                              enabled={preferences.types[item.key]}
                              icon={item.icon}
                              label={item.label}
                              onPress={() => void onToggleNotificationType(item.key, !preferences.types[item.key])}
                            />
                          ))}
                      </PreferenceGroup>

                      <View className="rounded-[24px] border border-border/70 bg-background px-4 py-4">
                        <Text className="text-sm leading-6 text-muted-foreground">
                          {criticalEnabled}/4 critical alerts and {updatesEnabled}/4 update categories are currently enabled.
                        </Text>
                      </View>
                    </View>
                  )
                : (
                    <View className="rounded-2xl border border-border/70 bg-background px-4 py-4">
                      <Text className="text-sm leading-6 text-muted-foreground">
                        Notifications are disabled. Enable them to receive stock, invoice, and payment alerts.
                      </Text>
                    </View>
                  )}
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Passkeys</CardTitle>
              <CardDescription>
                Register and manage server-backed passkeys for this account.
              </CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              <Button
                variant="outline"
                className="h-14 w-full gap-2 rounded-[22px]"
                disabled={isRegisteringPasskey}
                onPress={onRegisterPasskey}>
                {isRegisteringPasskey ? (
                  <ActivityIndicator color="#0f172a" />
                ) : (
                  <>
                    <Icon as={Fingerprint} className="text-foreground" size={16} />
                    <Text className="text-base">Create passkey on this device</Text>
                  </>
                )}
              </Button>

              <Text className="text-sm leading-5 text-muted-foreground">
                This requires a supported device, a development or production build, and a configured HTTPS passkey domain.
              </Text>

              {isPasskeysLoading ? (
                <View className="items-center rounded-[24px] border border-border/70 bg-background px-4 py-8">
                  <ActivityIndicator />
                </View>
              ) : null}

              {!isPasskeysLoading && passkeys.length === 0 ? (
                <View className="rounded-[24px] border border-border/70 bg-background px-4 py-4">
                  <View className="flex-row items-start gap-4">
                    <View className="rounded-2xl bg-primary/10 px-3 py-3">
                      <Icon as={Fingerprint} className="text-primary" size={18} />
                    </View>
                    <View className="flex-1 gap-1">
                      <Text className="font-semibold text-foreground">No passkeys registered</Text>
                      <Text className="text-sm leading-5 text-muted-foreground">
                        Your server supports passkeys, but none are registered for this account yet.
                      </Text>
                    </View>
                  </View>
                </View>
              ) : null}

              {!isPasskeysLoading
                ? passkeys.map((passkey) => (
                    <View
                      key={passkey.credential_id}
                      className="rounded-[24px] border border-border/70 bg-background px-4 py-4">
                      <View className="flex-row items-start gap-4">
                        <View className="rounded-2xl bg-primary/10 px-3 py-3">
                          <Icon as={Fingerprint} className="text-primary" size={18} />
                        </View>
                        <View className="flex-1 gap-1">
                          <Text className="font-semibold text-foreground">{passkey.label}</Text>
                          <Text className="text-sm text-muted-foreground">
                            Device type: {formatPasskeyDeviceType(passkey)}
                          </Text>
                          <Text className="text-sm text-muted-foreground">
                            Sync status: {passkey.credential_backed_up ? 'Synced or multi-device passkey' : 'Saved only on one device'}
                          </Text>
                          <Text className="text-sm text-muted-foreground">
                            Last used: {passkey.last_used_at ? new Date(passkey.last_used_at).toLocaleString() : 'Never'}
                          </Text>
                        </View>
                        <Pressable
                          accessibilityLabel="Remove passkey"
                          accessibilityRole="button"
                          className="rounded-full border border-destructive/30 bg-destructive/10 p-2.5"
                          disabled={isDeletingId === passkey.credential_id}
                          onPress={() => setPendingDeletePasskey(passkey)}>
                          {isDeletingId === passkey.credential_id ? (
                            <ActivityIndicator color="#dc2626" />
                          ) : (
                            <Icon as={Trash2} className="text-destructive" size={16} />
                          )}
                        </Pressable>
                      </View>
                    </View>
                  ))
                : null}
            </CardContent>
          </Card>
        </View>
      </ScrollView>
      <AlertDialog open={!!pendingDeletePasskey} onOpenChange={(open) => {
        if (!open) {
          setPendingDeletePasskey(null);
        }
      }}>
        <AlertDialogContent className="rounded-[28px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove passkey?</AlertDialogTitle>
            <AlertDialogDescription>
              This device passkey will stop working for sign-in until you register it again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Text>Cancel</Text>
            </AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onPress={() => {
              if (pendingDeletePasskey) {
                void onDeletePasskey(pendingDeletePasskey.credential_id);
              }
            }}>
              <Text>Remove</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ToastBanner message={message} variant="success" />
    </SafeAreaView>
  );
}

function PreferenceGroup({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <View className="rounded-[26px] border border-border/70 bg-background px-4 py-4">
      <View className="mb-4 gap-1">
        <Text className="font-semibold text-foreground">{title}</Text>
        <Text className="text-sm leading-5 text-muted-foreground">{description}</Text>
      </View>
      <View className="gap-3">{children}</View>
    </View>
  );
}

function buildPasskeyLabel() {
  const platformLabel =
    Platform.OS === 'android'
      ? 'Android device'
      : Platform.OS === 'ios'
        ? 'iPhone or iPad'
        : 'This device';

  return `${platformLabel} ${new Date().toLocaleDateString()}`;
}

function formatPasskeyDeviceType(passkey: PasskeyCredential) {
  if (passkey.credential_device_type === 'multiDevice') {
    return 'Synced passkey';
  }

  if (passkey.credential_device_type === 'singleDevice') {
    return 'This device only';
  }

  return passkey.credential_device_type;
}

function PreferenceRow({
  description,
  enabled,
  icon,
  label,
  onPress,
}: {
  description: string;
  enabled: boolean;
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      className={`rounded-[22px] border px-4 py-4 ${
        enabled ? 'border-primary/20 bg-primary/5' : 'border-border/70 bg-card'
      }`}
      onPress={onPress}>
      <View className="flex-row items-center gap-4">
        <View className={`rounded-2xl px-3 py-3 ${enabled ? 'bg-primary' : 'bg-primary/10'}`}>
          <Icon as={icon} className={enabled ? 'text-primary-foreground' : 'text-primary'} size={18} />
        </View>
        <View className="flex-1 gap-1">
          <Text className="font-semibold text-foreground">{label}</Text>
          <Text className="text-sm leading-5 text-muted-foreground">{description}</Text>
        </View>
        <View className={`rounded-full px-3 py-1 ${enabled ? 'bg-primary' : 'bg-muted'}`}>
          <Text className={enabled ? 'text-primary-foreground' : 'text-muted-foreground'}>
            {enabled ? 'On' : 'Off'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
