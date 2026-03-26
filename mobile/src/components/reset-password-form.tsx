import * as React from 'react';
import { ActivityIndicator, TextInput, TouchableOpacity, View } from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowRight, Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { authService } from '@/services/auth.service';

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; token?: string }>();
  const passwordInputRef = React.useRef<TextInput>(null);
  const [token, setToken] = React.useState(typeof params.token === 'string' ? params.token : '');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  async function onSubmit() {
    if (!token.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Enter the token and both password fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await authService.verifyResetToken(token.trim());
      await authService.resetPassword({
        token: token.trim(),
        new_password: password,
      });
      setSuccessMessage('Password reset complete. Sign in with your new password.');
      router.replace('/(auth)/login');
    } catch (submitError: any) {
      setError(
        submitError?.response?.data?.error?.message ??
          submitError?.response?.data?.message ??
          'Unable to reset password. Check the token and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View className="gap-6">
      <Card className="overflow-hidden rounded-[30px] border-border/80 bg-card shadow-sm shadow-black/5">
        <View className="absolute -right-12 top-0 h-32 w-32 rounded-full bg-primary/10" />
        <View className="absolute -bottom-12 -left-10 h-24 w-24 rounded-full bg-secondary/80" />
        <CardHeader className="gap-3">
          <CardTitle className="text-center text-3xl">Reset password</CardTitle>
          <CardDescription className="text-center leading-6">
            {typeof params.email === 'string'
              ? `Use the token sent to ${params.email}.`
              : 'Use the token from your email to set a new password.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          <View className="gap-5">
            <View className="gap-2">
              <Label htmlFor="token">Reset token</Label>
              <View className="flex-row items-center gap-3 rounded-[22px] border border-border/70 bg-muted/35 px-4">
                <Icon as={ShieldCheck} className="text-muted-foreground" size={18} />
                <Input
                  id="token"
                  className="h-14 flex-1 rounded-none border-0 bg-transparent px-0 text-base shadow-none"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setToken}
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  placeholder="Paste the token"
                  returnKeyType="next"
                  value={token}
                />
              </View>
            </View>

            <View className="gap-2">
              <Label htmlFor="password">New password</Label>
              <View className="flex-row items-center gap-3 rounded-[22px] border border-border/70 bg-muted/35 px-4">
                <Icon as={KeyRound} className="text-muted-foreground" size={18} />
                <Input
                  ref={passwordInputRef}
                  id="password"
                  className="h-14 flex-1 rounded-none border-0 bg-transparent px-0 text-base shadow-none"
                  secureTextEntry={!showPassword}
                  onChangeText={setPassword}
                  onSubmitEditing={() => {}}
                  returnKeyType="next"
                  value={password}
                />
                <TouchableOpacity
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  accessibilityRole="button"
                  className="rounded-full p-1"
                  onPress={() => setShowPassword((current) => !current)}>
                  <Icon as={showPassword ? EyeOff : Eye} className="text-muted-foreground" size={18} />
                </TouchableOpacity>
              </View>
            </View>

            <View className="gap-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <View className="flex-row items-center gap-3 rounded-[22px] border border-border/70 bg-muted/35 px-4">
                <Icon as={KeyRound} className="text-muted-foreground" size={18} />
                <Input
                  id="confirmPassword"
                  className="h-14 flex-1 rounded-none border-0 bg-transparent px-0 text-base shadow-none"
                  secureTextEntry={!showConfirmPassword}
                  onChangeText={setConfirmPassword}
                  onSubmitEditing={onSubmit}
                  returnKeyType="done"
                  value={confirmPassword}
                />
                <TouchableOpacity
                  accessibilityLabel={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  accessibilityRole="button"
                  className="rounded-full p-1"
                  onPress={() => setShowConfirmPassword((current) => !current)}>
                  <Icon as={showConfirmPassword ? EyeOff : Eye} className="text-muted-foreground" size={18} />
                </TouchableOpacity>
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
                  <Text className="text-base">Update password</Text>
                  <Icon as={ArrowRight} className="text-primary-foreground" size={16} />
                </>
              )}
            </Button>
          </View>

          <Text className="text-center text-sm leading-6">
            Need another token?{' '}
            <Link href="/(auth)/forgot-password" asChild>
              <Text className="text-sm underline underline-offset-4">Request again</Text>
            </Link>
          </Text>
        </CardContent>
      </Card>
    </View>
  );
}
