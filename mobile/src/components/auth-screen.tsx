import * as React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MoonStar, ShieldCheck, SunMedium } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useAppTheme } from '@/theme/theme-provider';

type AuthScreenScrollContextValue = {
  scrollToField: (offset: number) => void;
};

const AuthScreenScrollContext = React.createContext<AuthScreenScrollContextValue | null>(null);

export function useAuthScreenScroll() {
  return React.useContext(AuthScreenScrollContext);
}

export function AuthScreen({
  children,
  eyebrow,
  subtitle,
  title,
}: {
  children: React.ReactNode;
  eyebrow?: string;
  subtitle?: string;
  title?: string;
}) {
  const { resolvedTheme, themeMode, toggleTheme } = useAppTheme();
  const scrollViewRef = React.useRef<ScrollView>(null);

  const value = React.useMemo<AuthScreenScrollContextValue>(
    () => ({
      scrollToField: (offset) => {
        scrollViewRef.current?.scrollTo({
          animated: true,
          y: Math.max(offset - 220, 0),
        });
      },
    }),
    []
  );

  const showHero = Boolean(title || subtitle || eyebrow);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <AuthScreenScrollContext.Provider value={value}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1">
          <ScrollView
            ref={scrollViewRef}
            contentContainerClassName="flex-grow justify-center bg-background px-6 py-8 pb-24"
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View className="gap-8">
              <View className="gap-6">
                <View className="flex-row items-center justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 rounded-full px-3"
                    onPress={toggleTheme}>
                    <Icon
                      as={resolvedTheme === 'dark' ? SunMedium : MoonStar}
                      className="text-foreground"
                      size={16}
                    />
                    <Text className="text-xs uppercase tracking-[1px]">
                      {themeMode === 'system' ? `Auto ${resolvedTheme}` : themeMode}
                    </Text>
                  </Button>
                </View>
                {showHero ? (
                  <View className="overflow-hidden rounded-[28px] border border-border bg-card px-5 py-6 shadow-sm shadow-black/5">
                    <View className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/10" />
                    <View className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-secondary/80" />
                    <View className="gap-4">
                      <View className="flex-row items-center gap-3">
                        <View className="w-12 rounded-2xl bg-primary px-0 py-3">
                          <Icon as={ShieldCheck} className="mx-auto text-primary-foreground" size={22} />
                        </View>
                        {eyebrow ? (
                          <View className="rounded-full border border-border bg-background/80 px-3 py-1.5">
                            <Text className="text-xs font-semibold uppercase tracking-[2px] text-muted-foreground">
                              {eyebrow}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <View className="gap-2">
                        {title ? (
                          <Text className="text-4xl font-extrabold tracking-tight text-foreground">{title}</Text>
                        ) : null}
                        {subtitle ? (
                          <Text className="text-base leading-6 text-muted-foreground">{subtitle}</Text>
                        ) : null}
                      </View>
                    </View>
                  </View>
                ) : null}
              </View>
              {children}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </AuthScreenScrollContext.Provider>
    </SafeAreaView>
  );
}
