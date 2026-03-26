import * as React from 'react';
import {
  ActivityIndicator,
  type LayoutChangeEvent,
  type TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { ArrowRight, Eye, EyeOff, Fingerprint, KeyRound, Mail } from 'lucide-react-native';
import { Passkey } from 'react-native-passkey';

import { useAuthScreenScroll } from '@/components/auth-screen';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth-store';

export function SignInForm() {
  const router = useRouter();
  const authScreenScroll = useAuthScreenScroll();
  const { setAuth } = useAuthStore();
  const passwordInputRef = React.useRef<TextInput>(null);
  const identifierOffsetRef = React.useRef(0);
  const passwordOffsetRef = React.useRef(0);
  const [identifier, setIdentifier] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isPasskeySubmitting, setIsPasskeySubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  function onFieldLayout(ref: React.MutableRefObject<number>) {
    return (event: LayoutChangeEvent) => {
      ref.current = event.nativeEvent.layout.y;
    };
  }

  function focusField(offset: number) {
    authScreenScroll?.scrollToField(offset);
  }

  function onIdentifierSubmitEditing() {
    passwordInputRef.current?.focus();
  }

  async function onSubmit() {
    if (!identifier.trim() || !password.trim()) {
      setError('Enter your email or phone and password.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await authService.login({
        identifier: identifier.trim(),
        password,
      });

      setAuth(response.user, response.tokens, response.session);
      router.replace('/(app)');
    } catch (loginError: any) {
      setError(
        loginError?.response?.data?.error?.message ??
          loginError?.response?.data?.message ??
          'Login failed. Check your credentials and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onPasskeySubmit() {
    if (!identifier.trim()) {
      setError('Enter your email or phone first to use a passkey.');
      return;
    }

    if (!Passkey.isSupported()) {
      setError('Passkeys require a supported device and a development or production build, not Expo Go.');
      return;
    }

    setIsPasskeySubmitting(true);
    setError(null);

    try {
      const options = await authService.beginPasskeyLogin(identifier.trim());
      const passkeyResponse = await Passkey.get(options);
      const response = await authService.verifyPasskeyLogin({
        identifier: identifier.trim(),
        response: passkeyResponse,
      });

      setAuth(response.user, response.tokens, response.session);

      if (!response.user.is_verified) {
        router.replace({
          pathname: '/(auth)/verify-email',
          params: { email: response.user.email },
        });
        return;
      }

      router.replace('/(app)');
    } catch (passkeyError: any) {
      setError(
        passkeyError?.response?.data?.error?.message ??
          passkeyError?.response?.data?.message ??
          passkeyError?.message ??
          'Passkey sign in failed. Try again.'
      );
    } finally {
      setIsPasskeySubmitting(false);
    }
  }

  return (
    <View className="gap-6">
      <Card className="overflow-hidden rounded-[30px] border-border/80 bg-card shadow-sm shadow-black/5">
        <View className="absolute -right-14 top-0 h-32 w-32 rounded-full bg-primary/10" />
        <View className="absolute -bottom-10 -left-10 h-24 w-24 rounded-full bg-secondary/80" />
        <CardHeader className="gap-3">
          <CardTitle className="text-center text-3xl">Sign in</CardTitle>
          <CardDescription className="text-center leading-6">
            Continue into your workspace with the same backend account.
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          <View className="gap-5">
            <View className="gap-2" onLayout={onFieldLayout(identifierOffsetRef)}>
              <Label htmlFor="identifier">Email or phone</Label>
              <View className="flex-row items-center gap-3 rounded-[22px] border border-border/70 bg-muted/35 px-4">
                <Icon as={Mail} className="text-muted-foreground" size={18} />
                <Input
                  id="identifier"
                  className="h-14 flex-1 rounded-none border-0 bg-transparent px-0 text-base shadow-none"
                  placeholder="m@example.com or +91 9876543210"
                  keyboardType="email-address"
                  autoComplete="email"
                  autoCapitalize="none"
                  blurOnSubmit={false}
                  enterKeyHint="next"
                  onChangeText={setIdentifier}
                  onFocus={() => focusField(identifierOffsetRef.current)}
                  onSubmitEditing={onIdentifierSubmitEditing}
                  returnKeyType="next"
                  submitBehavior="submit"
                  value={identifier}
                />
              </View>
            </View>

            <View className="gap-2" onLayout={onFieldLayout(passwordOffsetRef)}>
              <View className="flex-row items-center">
                <Label htmlFor="password">Password</Label>
                <Link href="/(auth)/forgot-password" asChild>
                  <Button variant="link" size="sm" className="web:h-fit ml-auto h-4 px-1 py-0 sm:h-4">
                    <Text className="font-normal leading-4">Forgot your password?</Text>
                  </Button>
                </Link>
              </View>
              <View className="flex-row items-center gap-3 rounded-[22px] border border-border/70 bg-muted/35 px-4">
                <Icon as={KeyRound} className="text-muted-foreground" size={18} />
                <Input
                  ref={passwordInputRef}
                  id="password"
                  className="h-14 flex-1 rounded-none border-0 bg-transparent px-0 text-base shadow-none"
                  secureTextEntry={!showPassword}
                  enterKeyHint="done"
                  onChangeText={setPassword}
                  onFocus={() => focusField(passwordOffsetRef.current)}
                  returnKeyType="done"
                  onSubmitEditing={onSubmit}
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

            {error ? (
              <View className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-3">
                <Text className="text-sm text-destructive">{error}</Text>
              </View>
            ) : null}

            <Button className="h-14 w-full gap-2 rounded-[22px]" disabled={isSubmitting} onPress={onSubmit}>
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Text className="text-base">Continue</Text>
                  <Icon as={ArrowRight} className="text-primary-foreground" size={16} />
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="h-14 w-full gap-2 rounded-[22px]"
              disabled={isPasskeySubmitting}
              onPress={onPasskeySubmit}>
              {isPasskeySubmitting ? (
                <ActivityIndicator color="#0f172a" />
              ) : (
                <>
                  <Icon as={Fingerprint} className="text-foreground" size={16} />
                  <Text className="text-base">Use passkey</Text>
                </>
              )}
            </Button>
          </View>

          <Text className="text-center text-sm leading-6">
            Don&apos;t have an account?{' '}
            <Link href="/(auth)/signup" asChild>
              <Text className="text-sm underline underline-offset-4">Create one</Text>
            </Link>
          </Text>
        </CardContent>
      </Card>
    </View>
  );
}
