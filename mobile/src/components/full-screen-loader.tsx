import * as React from 'react';
import { Animated, Easing, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Boxes, ReceiptText, RefreshCw, ShieldCheck } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { useAppTheme } from '@/theme/theme-provider';

export function FullScreenLoader({ label }: { label: string }) {
  const { resolvedTheme } = useAppTheme();
  const pulse = React.useRef(new Animated.Value(0.96)).current;
  const spin = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          duration: 1200,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          duration: 1200,
          toValue: 0.96,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [pulse]);

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spin, {
        duration: 900,
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: true,
      })
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [spin]);

  const palette =
    resolvedTheme === 'dark'
      ? {
          accent: '#f8fafc',
          accentMuted: 'rgba(248,250,252,0.12)',
          bg: '#020617',
          card: 'rgba(15,23,42,0.92)',
          ring: 'rgba(148,163,184,0.18)',
          soft: 'rgba(30,41,59,0.75)',
          spinner: '#f8fafc',
          subtitle: '#94a3b8',
        }
      : {
          accent: '#0f172a',
          accentMuted: 'rgba(15,23,42,0.06)',
          bg: '#f8fafc',
          card: 'rgba(255,255,255,0.94)',
          ring: 'rgba(15,23,42,0.08)',
          soft: 'rgba(226,232,240,0.9)',
          spinner: '#0f172a',
          subtitle: '#64748b',
        };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: palette.bg }}>
      <View className="flex-1 overflow-hidden px-6 py-8">
        <View
          className="absolute -left-10 top-16 h-40 w-40 rounded-full"
          style={{ backgroundColor: palette.accentMuted }}
        />
        <View
          className="absolute -right-12 top-36 h-32 w-32 rounded-full"
          style={{ backgroundColor: palette.soft }}
        />
        <View
          className="absolute bottom-10 right-4 h-48 w-48 rounded-full"
          style={{ backgroundColor: palette.accentMuted }}
        />

        <View className="flex-1 items-center justify-center">
          <Animated.View
            className="w-full max-w-[360px] rounded-[32px] border px-6 py-8"
            style={{
              backgroundColor: palette.card,
              borderColor: palette.ring,
              shadowColor: resolvedTheme === 'dark' ? '#000000' : '#0f172a',
              shadowOffset: { width: 0, height: 16 },
              shadowOpacity: resolvedTheme === 'dark' ? 0.3 : 0.1,
              shadowRadius: 28,
              transform: [{ scale: pulse }],
            }}>
            <View className="gap-8">
              <View className="items-center gap-4">
                <View className="flex-row items-center gap-3">
                  <View className="rounded-[22px] bg-primary px-4 py-4">
                    <ShieldCheck color="#ffffff" size={24} />
                  </View>
                  <View className="gap-2">
                    <View className="flex-row gap-2">
                      <View className="rounded-2xl px-3 py-2" style={{ backgroundColor: palette.accentMuted }}>
                        <Boxes color={palette.accent} size={16} />
                      </View>
                      <View className="rounded-2xl px-3 py-2" style={{ backgroundColor: palette.accentMuted }}>
                        <ReceiptText color={palette.accent} size={16} />
                      </View>
                    </View>
                  </View>
                </View>

                <View className="items-center gap-2">
                  <Text className="text-xs font-semibold uppercase tracking-[3px] text-muted-foreground">
                    VyaparX Mobile
                  </Text>
                  <Text className="text-center text-3xl font-extrabold tracking-tight text-foreground">
                    Preparing your workspace
                  </Text>
                  <Text className="text-center text-base leading-6" style={{ color: palette.subtitle }}>
                    Secure session restore, business context, and dashboard startup are in progress.
                  </Text>
                </View>
              </View>

              <View className="gap-4">
                <View
                  className="flex-row items-center gap-3 rounded-[24px] border px-4 py-4"
                  style={{ backgroundColor: palette.accentMuted, borderColor: palette.ring }}>
                  <Animated.View
                    style={{
                      transform: [
                        {
                          rotate: spin.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '360deg'],
                          }),
                        },
                      ],
                    }}>
                    <RefreshCw color={palette.spinner} size={16} />
                  </Animated.View>
                  <Text className="flex-1 text-sm font-medium text-foreground">{label}</Text>
                </View>

                <View className="flex-row items-center justify-center gap-2">
                  <LoaderDot delay={0} />
                  <LoaderDot delay={180} />
                  <LoaderDot delay={360} />
                </View>
              </View>
            </View>
          </Animated.View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function LoaderDot({ delay }: { delay: number }) {
  const opacity = React.useRef(new Animated.Value(0.25)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, {
          duration: 480,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          duration: 480,
          toValue: 0.25,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [delay, opacity]);

  return <Animated.View className="h-2.5 w-2.5 rounded-full bg-primary" style={{ opacity }} />;
}
