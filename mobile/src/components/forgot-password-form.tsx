import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { ArrowRight, Mail } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { authService } from '@/services/auth.service';

export function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function onSubmit() {
    if (!email.trim()) {
      setError('Enter your email address.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await authService.forgotPassword(email.trim());
      setSuccessMessage('Reset instructions were sent. Continue with the token from your email.');
      router.push({
        pathname: '/(auth)/reset-password',
        params: { email: email.trim() },
      });
    } catch (submitError: any) {
      setError(
        submitError?.response?.data?.error?.message ??
          submitError?.response?.data?.message ??
          'Unable to start password reset. Try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View className="gap-6">
      <Card className="overflow-hidden rounded-[30px] border-border/80 bg-card shadow-sm shadow-black/5">
        <View className="absolute -right-10 top-0 h-28 w-28 rounded-full bg-primary/10" />
        <View className="absolute -bottom-12 -left-10 h-24 w-24 rounded-full bg-secondary/80" />
        <CardHeader className="gap-3">
          <CardTitle className="text-center text-3xl">Forgot password</CardTitle>
          <CardDescription className="text-center leading-6">
            Enter your email and we&apos;ll start the reset flow from the server.
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          <View className="gap-5">
            <View className="gap-2">
              <Label htmlFor="email">Email</Label>
              <View className="flex-row items-center gap-3 rounded-[22px] border border-border/70 bg-muted/35 px-4">
                <Icon as={Mail} className="text-muted-foreground" size={18} />
                <Input
                  id="email"
                  className="h-14 flex-1 rounded-none border-0 bg-transparent px-0 text-base shadow-none"
                  placeholder="m@example.com"
                  keyboardType="email-address"
                  autoComplete="email"
                  autoCapitalize="none"
                  enterKeyHint="send"
                  onChangeText={setEmail}
                  onSubmitEditing={onSubmit}
                  returnKeyType="send"
                  value={email}
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
                  <Text className="text-base">Send reset instructions</Text>
                  <Icon as={ArrowRight} className="text-primary-foreground" size={16} />
                </>
              )}
            </Button>
          </View>

          <Text className="text-center text-sm leading-6">
            Remembered your password?{' '}
            <Link href="/(auth)/login" asChild>
              <Text className="text-sm underline underline-offset-4">Back to sign in</Text>
            </Link>
          </Text>
        </CardContent>
      </Card>
    </View>
  );
}
