import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowRight, MailCheck, RotateCw, ShieldCheck } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth-store';

export function VerifyEmailForm() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; token?: string }>();
  const { user, setUser } = useAuthStore();
  const [token, setToken] = React.useState(typeof params.token === 'string' ? params.token : '');
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isResending, setIsResending] = React.useState(false);

  async function onSubmit() {
    if (!token.trim()) {
      setError('Enter the verification token.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await authService.verifyEmail(token.trim());

      if (user) {
        setUser({ ...user, is_verified: true });
      }

      setSuccessMessage('Email verified successfully.');
      router.replace('/(app)/profile');
    } catch (submitError: any) {
      setError(
        submitError?.response?.data?.error?.message ??
          submitError?.response?.data?.message ??
          'Unable to verify email. Check the token and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onResend() {
    setIsResending(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (user?.email) {
        await authService.resendVerificationEmail();
      } else if (typeof params.email === 'string' && params.email.trim()) {
        await authService.sendVerificationEmail(params.email.trim());
      } else {
        throw new Error('Missing email for verification.');
      }

      setSuccessMessage('Verification email sent again.');
    } catch (resendError: any) {
      setError(
        resendError?.response?.data?.error?.message ??
          resendError?.response?.data?.message ??
          resendError?.message ??
          'Unable to resend verification email right now.'
      );
    } finally {
      setIsResending(false);
    }
  }

  return (
    <View className="gap-6">
      <Card className="overflow-hidden rounded-[30px] border-border/80 bg-card shadow-sm shadow-black/5">
        <View className="absolute -right-10 top-0 h-32 w-32 rounded-full bg-primary/10" />
        <View className="absolute -bottom-10 -left-10 h-24 w-24 rounded-full bg-secondary/80" />
        <CardHeader className="gap-3">
          <CardTitle className="text-center text-3xl">Verify email</CardTitle>
          <CardDescription className="text-center leading-6">
            {user?.email ?? params.email ?? 'Your account'}
            {' '}needs email verification before you can rely on all account actions.
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          <View className="gap-5">
            <View className="gap-2">
              <Label htmlFor="token">Verification token</Label>
              <View className="flex-row items-center gap-3 rounded-[22px] border border-border/70 bg-muted/35 px-4">
                <Icon as={ShieldCheck} className="text-muted-foreground" size={18} />
                <Input
                  id="token"
                  className="h-14 flex-1 rounded-none border-0 bg-transparent px-0 text-base shadow-none"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setToken}
                  onSubmitEditing={onSubmit}
                  placeholder="Paste the token"
                  returnKeyType="send"
                  value={token}
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

            <Button className="h-14 w-full gap-2 rounded-[22px]" disabled={isSubmitting} onPress={onSubmit}>
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Text className="text-base">Verify email</Text>
                  <Icon as={MailCheck} className="text-primary-foreground" size={16} />
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="h-14 w-full gap-2 rounded-[22px]"
              disabled={isResending}
              onPress={onResend}>
              {isResending ? (
                <ActivityIndicator color="#0f172a" />
              ) : (
                <>
                  <Icon as={RotateCw} className="text-foreground" size={16} />
                  <Text className="text-base">Resend verification email</Text>
                </>
              )}
            </Button>
          </View>

          <Text className="text-center text-sm leading-6">
            Already verified?{' '}
            <Link href="/(auth)/login" asChild>
              <Text className="text-sm underline underline-offset-4">Go to sign in</Text>
            </Link>
          </Text>
        </CardContent>
      </Card>
    </View>
  );
}
