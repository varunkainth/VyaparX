import * as React from 'react';
import { ActivityIndicator, type LayoutChangeEvent, TextInput, TouchableOpacity, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { ArrowRight, Eye, EyeOff, KeyRound, Mail, Phone, UserRound } from 'lucide-react-native';

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

export function SignUpForm() {
  const router = useRouter();
  const authScreenScroll = useAuthScreenScroll();
  const { setAuth } = useAuthStore();
  const emailInputRef = React.useRef<TextInput>(null);
  const phoneInputRef = React.useRef<TextInput>(null);
  const passwordInputRef = React.useRef<TextInput>(null);
  const confirmPasswordInputRef = React.useRef<TextInput>(null);
  const nameOffsetRef = React.useRef(0);
  const emailOffsetRef = React.useRef(0);
  const phoneOffsetRef = React.useRef(0);
  const passwordOffsetRef = React.useRef(0);
  const confirmPasswordOffsetRef = React.useRef(0);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  function onFieldLayout(ref: React.MutableRefObject<number>) {
    return (event: LayoutChangeEvent) => {
      ref.current = event.nativeEvent.layout.y;
    };
  }

  function focusField(offset: number) {
    authScreenScroll?.scrollToField(offset);
  }

  function onNameSubmitEditing() {
    emailInputRef.current?.focus();
  }

  function onEmailSubmitEditing() {
    phoneInputRef.current?.focus();
  }

  function onPhoneSubmitEditing() {
    passwordInputRef.current?.focus();
  }

  function onPasswordSubmitEditing() {
    confirmPasswordInputRef.current?.focus();
  }

  async function onSubmit() {
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Complete all fields to create your account.');
      return;
    }

    if (password.length < 8) {
      setError('Use at least 8 characters for the password.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await authService.signup({
        email: email.trim(),
        name: name.trim(),
        password,
        phone: phone.trim(),
      });

      setAuth(response.user, response.tokens, response.session);

      if (!response.user.is_verified) {
        try {
          await authService.sendVerificationEmail(response.user.email);
        } catch {}

        router.replace({
          pathname: '/(auth)/verify-email',
          params: { email: response.user.email },
        });
        return;
      }

      router.replace('/(app)');
    } catch (signupError: any) {
      setError(
        signupError?.response?.data?.error?.message ??
          signupError?.response?.data?.message ??
          'Signup failed. Please review your details and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View className="gap-6">
      <Card className="overflow-hidden rounded-[30px] border-border/80 bg-card shadow-sm shadow-black/5">
        <View className="absolute -right-16 top-0 h-36 w-36 rounded-full bg-primary/10" />
        <View className="absolute -bottom-12 -left-10 h-28 w-28 rounded-full bg-secondary/80" />
        <CardHeader className="gap-3">
          <CardTitle className="text-center text-3xl">Create account</CardTitle>
          <CardDescription className="text-center leading-6">
            Start your workspace on mobile with a clean setup flow.
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          <View className="gap-4">
            <View className="gap-2" onLayout={onFieldLayout(nameOffsetRef)}>
              <Label htmlFor="name">Full name</Label>
              <View className="flex-row items-center gap-3 rounded-[22px] border border-border/70 bg-muted/35 px-4">
                <Icon as={UserRound} className="text-muted-foreground" size={18} />
                <Input
                  id="name"
                  className="h-14 flex-1 rounded-none border-0 bg-transparent px-0 text-base shadow-none"
                  autoCapitalize="words"
                  blurOnSubmit={false}
                  enterKeyHint="next"
                  onChangeText={setName}
                  onFocus={() => focusField(nameOffsetRef.current)}
                  onSubmitEditing={onNameSubmitEditing}
                  placeholder="Varun Sharma"
                  returnKeyType="next"
                  value={name}
                />
              </View>
            </View>

            <View className="gap-2" onLayout={onFieldLayout(emailOffsetRef)}>
              <Label htmlFor="email">Email</Label>
              <View className="flex-row items-center gap-3 rounded-[22px] border border-border/70 bg-muted/35 px-4">
                <Icon as={Mail} className="text-muted-foreground" size={18} />
                <Input
                  ref={emailInputRef}
                  id="email"
                  className="h-14 flex-1 rounded-none border-0 bg-transparent px-0 text-base shadow-none"
                  placeholder="m@example.com"
                  keyboardType="email-address"
                  autoComplete="email"
                  autoCapitalize="none"
                  blurOnSubmit={false}
                  enterKeyHint="next"
                  onChangeText={setEmail}
                  onFocus={() => focusField(emailOffsetRef.current)}
                  onSubmitEditing={onEmailSubmitEditing}
                  returnKeyType="next"
                  submitBehavior="submit"
                  value={email}
                />
              </View>
            </View>

            <View className="gap-2" onLayout={onFieldLayout(phoneOffsetRef)}>
              <Label htmlFor="phone">Phone</Label>
              <View className="flex-row items-center gap-3 rounded-[22px] border border-border/70 bg-muted/35 px-4">
                <Icon as={Phone} className="text-muted-foreground" size={18} />
                <Input
                  ref={phoneInputRef}
                  id="phone"
                  className="h-14 flex-1 rounded-none border-0 bg-transparent px-0 text-base shadow-none"
                  autoComplete="tel"
                  keyboardType="phone-pad"
                  blurOnSubmit={false}
                  enterKeyHint="next"
                  onChangeText={setPhone}
                  onFocus={() => focusField(phoneOffsetRef.current)}
                  onSubmitEditing={onPhoneSubmitEditing}
                  placeholder="+91 9876543210"
                  returnKeyType="next"
                  value={phone}
                />
              </View>
            </View>

            <View className="gap-2" onLayout={onFieldLayout(passwordOffsetRef)}>
              <Label htmlFor="password">Password</Label>
              <View className="flex-row items-center gap-3 rounded-[22px] border border-border/70 bg-muted/35 px-4">
                <Icon as={KeyRound} className="text-muted-foreground" size={18} />
                <Input
                  ref={passwordInputRef}
                  id="password"
                  className="h-14 flex-1 rounded-none border-0 bg-transparent px-0 text-base shadow-none"
                  secureTextEntry={!showPassword}
                  blurOnSubmit={false}
                  enterKeyHint="next"
                  onChangeText={setPassword}
                  onFocus={() => focusField(passwordOffsetRef.current)}
                  returnKeyType="next"
                  onSubmitEditing={onPasswordSubmitEditing}
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
              <Text className="text-sm text-muted-foreground">Use at least 8 characters.</Text>
            </View>

            <View className="gap-2" onLayout={onFieldLayout(confirmPasswordOffsetRef)}>
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <View className="flex-row items-center gap-3 rounded-[22px] border border-border/70 bg-muted/35 px-4">
                <Icon as={KeyRound} className="text-muted-foreground" size={18} />
                <Input
                  ref={confirmPasswordInputRef}
                  id="confirmPassword"
                  className="h-14 flex-1 rounded-none border-0 bg-transparent px-0 text-base shadow-none"
                  secureTextEntry={!showConfirmPassword}
                  enterKeyHint="done"
                  onChangeText={setConfirmPassword}
                  onFocus={() => focusField(confirmPasswordOffsetRef.current)}
                  returnKeyType="done"
                  onSubmitEditing={onSubmit}
                  value={confirmPassword}
                />
                <TouchableOpacity
                  accessibilityLabel={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  accessibilityRole="button"
                  className="rounded-full p-1"
                  onPress={() => setShowConfirmPassword((current) => !current)}>
                  <Icon
                    as={showConfirmPassword ? EyeOff : Eye}
                    className="text-muted-foreground"
                    size={18}
                  />
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
                  <Text className="text-base">Create account</Text>
                  <Icon as={ArrowRight} className="text-primary-foreground" size={16} />
                </>
              )}
            </Button>
          </View>

          <Text className="text-center text-sm leading-6">
            Already have an account?{' '}
            <Link href="/(auth)/login" asChild>
              <Text className="text-sm underline underline-offset-4">Sign in</Text>
            </Link>
          </Text>
        </CardContent>
      </Card>
    </View>
  );
}
