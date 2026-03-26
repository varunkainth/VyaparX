import * as React from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { Fingerprint, LockKeyhole, MoonStar, Smartphone, SunMedium, Trash2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Passkey } from 'react-native-passkey';

import { SubpageHeader } from '@/components/subpage-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { authService, type PasskeyCredential } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth-store';
import { useAppTheme } from '@/theme/theme-provider';

const themeOptions = [
  { description: 'Follow the device preference automatically.', icon: Smartphone, key: 'system', label: 'System' },
  { description: 'Bright interface for daytime usage.', icon: SunMedium, key: 'light', label: 'Light' },
  { description: 'Darker interface for lower glare.', icon: MoonStar, key: 'dark', label: 'Dark' },
] as const;

export default function SettingsScreen() {
  const router = useRouter();
  const { clearAuth } = useAuthStore();
  const { resolvedTheme, setThemeMode, themeMode } = useAppTheme();
  const [passkeys, setPasskeys] = React.useState<PasskeyCredential[]>([]);
  const [isPasskeysLoading, setIsPasskeysLoading] = React.useState(true);
  const [isDeletingId, setIsDeletingId] = React.useState<string | null>(null);
  const [isRegisteringPasskey, setIsRegisteringPasskey] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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
    } catch (deleteError: any) {
      setError(
        deleteError?.response?.data?.error?.message ??
          deleteError?.response?.data?.message ??
          'Unable to remove passkey right now.'
      );
    } finally {
      setIsDeletingId(null);
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
        label: 'This device',
        response,
      });

      setPasskeys((current) => [credential, ...current.filter((item) => item.credential_id !== credential.credential_id)]);
      setSuccessMessage('Passkey registered successfully.');
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
                            Device type: {passkey.credential_device_type}
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
                          onPress={() => onDeletePasskey(passkey.credential_id)}>
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
    </SafeAreaView>
  );
}
