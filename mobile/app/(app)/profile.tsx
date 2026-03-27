import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, MailCheck, PencilLine, Phone, ShieldCheck, UserRound } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SubpageHeader } from '@/components/subpage-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { ToastBanner, useTimedToast } from '@/components/ui/toast-banner';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth-store';

export default function ProfileScreen() {
  const router = useRouter();
  const { setUser, user } = useAuthStore();
  const { message, showToast } = useTimedToast();
  const [isEditing, setIsEditing] = React.useState(false);
  const [name, setName] = React.useState(user?.name ?? '');
  const [email, setEmail] = React.useState(user?.email ?? '');
  const [phone, setPhone] = React.useState(user?.phone ?? '');
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    setName(user?.name ?? '');
    setEmail(user?.email ?? '');
    setPhone(user?.phone ?? '');
  }, [user]);

  async function onSave() {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError('Name, email, and phone are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const updatedUser = await authService.updateMe({
        email: email.trim(),
        name: name.trim(),
        phone: phone.trim(),
      });

      setUser(updatedUser);
      setSuccessMessage('Profile updated successfully.');
      showToast('Profile updated successfully.');
      setIsEditing(false);
    } catch (submitError: any) {
      setError(
        submitError?.response?.data?.error?.message ??
          submitError?.response?.data?.message ??
          'Unable to update profile. Try again.'
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
            backHref="/(app)/more"
            eyebrow="Profile"
            subtitle="Keep your personal account details updated and verify your email state."
            title="Your account"
          />

          <Card className="overflow-hidden rounded-[28px]">
            <View className="absolute -right-10 top-0 h-28 w-28 rounded-full bg-primary/10" />
            <CardHeader className="flex-row items-start justify-between gap-4">
              <View className="flex-1 gap-2">
                <CardTitle>Profile details</CardTitle>
                <CardDescription>Edit the main identity fields tied to your auth account.</CardDescription>
              </View>
              <Pressable
                accessibilityLabel={isEditing ? 'Stop editing profile' : 'Edit profile'}
                accessibilityRole="button"
                className="rounded-full border border-border bg-background px-4 py-2"
                onPress={() => {
                  setError(null);
                  setSuccessMessage(null);
                  setIsEditing((current) => !current);
                }}>
                <View className="flex-row items-center gap-2">
                  <Icon as={PencilLine} className="text-foreground" size={16} />
                  <Text className="font-medium text-foreground">{isEditing ? 'Cancel' : 'Edit'}</Text>
                </View>
              </Pressable>
            </CardHeader>
            <CardContent className="gap-4">
              <ProfileField
                editable={isEditing}
                icon={UserRound}
                id="name"
                label="Name"
                onChangeText={setName}
                value={name}
              />
              <ProfileField
                editable={isEditing}
                icon={Mail}
                id="email"
                keyboardType="email-address"
                label="Email"
                onChangeText={setEmail}
                value={email}
              />
              <ProfileField
                editable={isEditing}
                icon={Phone}
                id="phone"
                keyboardType="phone-pad"
                label="Phone"
                onChangeText={setPhone}
                value={phone}
              />

              <View className="flex-row items-center gap-4 rounded-2xl border border-border/70 bg-background px-4 py-4">
                <View className="rounded-2xl bg-primary/10 px-3 py-3">
                  <Icon as={ShieldCheck} className="text-primary" size={18} />
                </View>
                <View className="flex-1 gap-1">
                  <Text className="text-sm text-muted-foreground">Verification</Text>
                  <Text className="font-semibold text-foreground">
                    {user?.is_verified ? 'Verified' : 'Pending verification'}
                  </Text>
                </View>
                {!user?.is_verified ? (
                  <Pressable
                    accessibilityLabel="Open verify email screen"
                    accessibilityRole="button"
                    className="rounded-full bg-primary px-4 py-2"
                    onPress={() =>
                      router.push({
                        pathname: '/(auth)/verify-email',
                        params: user?.email ? { email: user.email } : undefined,
                      })
                    }>
                    <View className="flex-row items-center gap-2">
                      <Icon as={MailCheck} className="text-primary-foreground" size={16} />
                      <Text className="font-medium text-primary-foreground">Verify</Text>
                    </View>
                  </Pressable>
                ) : null}
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

              {isEditing ? (
                <Button className="h-14 rounded-[22px]" disabled={isSubmitting} onPress={onSave}>
                  {isSubmitting ? <ActivityIndicator color="#ffffff" /> : <Text className="text-base">Save changes</Text>}
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </View>
      </ScrollView>
      <ToastBanner message={message} variant="success" />
    </SafeAreaView>
  );
}

function ProfileField({
  editable,
  icon,
  id,
  keyboardType,
  label,
  onChangeText,
  value,
}: {
  editable: boolean;
  icon: typeof UserRound;
  id: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  label: string;
  onChangeText: (value: string) => void;
  value: string;
}) {
  return (
    <View className="gap-2">
      <Label htmlFor={id}>{label}</Label>
      <View className="flex-row items-center gap-3 rounded-[22px] border border-border/70 bg-muted/35 px-4">
        <Icon as={icon} className="text-muted-foreground" size={18} />
        <Input
          id={id}
          className="h-14 flex-1 rounded-none border-0 bg-transparent px-0 text-base shadow-none"
          editable={editable}
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          value={value}
        />
      </View>
    </View>
  );
}
