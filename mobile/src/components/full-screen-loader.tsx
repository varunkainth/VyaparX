import * as React from 'react';
import { Animated, Easing, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Boxes, ChartColumnBig, ReceiptText, RefreshCw, ShieldCheck } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { useAppTheme } from '@/theme/theme-provider';

export function FullScreenLoader({ label }: { label: string }) {
  const { resolvedTheme } = useAppTheme();
  const pulse = React.useRef(new Animated.Value(0.96)).current;
  const spin = React.useRef(new Animated.Value(0)).current;
  const float = React.useRef(new Animated.Value(0)).current;

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

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          toValue: -8,
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          toValue: 0,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [float]);

  const palette =
    resolvedTheme === 'dark'
      ? {
          accent: '#f8fafc',
          accentMuted: 'rgba(226,232,240,0.14)',
          bg: '#020617',
          card: 'rgba(9,16,28,0.94)',
          chip: 'rgba(15,23,42,0.92)',
          glowA: 'rgba(56,189,248,0.14)',
          glowB: 'rgba(34,197,94,0.11)',
          hero: '#e2e8f0',
          heroIcon: '#0f172a',
          ring: 'rgba(148,163,184,0.16)',
          soft: 'rgba(15,23,42,0.8)',
          spinner: '#f8fafc',
          statusBg: 'rgba(51,65,85,0.45)',
          subtitle: '#94a3b8',
          title: '#f8fafc',
        }
      : {
          accent: '#0f172a',
          accentMuted: 'rgba(15,23,42,0.06)',
          bg: '#f6f7fb',
          card: 'rgba(255,255,255,0.97)',
          chip: 'rgba(248,250,252,0.96)',
          glowA: 'rgba(14,165,233,0.12)',
          glowB: 'rgba(34,197,94,0.1)',
          hero: '#0f172a',
          heroIcon: '#ffffff',
          ring: 'rgba(15,23,42,0.08)',
          soft: 'rgba(226,232,240,0.88)',
          spinner: '#0f172a',
          statusBg: 'rgba(248,250,252,0.9)',
          subtitle: '#64748b',
          title: '#0f172a',
        };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: palette.bg }}>
      <View className="flex-1 overflow-hidden px-6 py-8">
        <View
          className="absolute -left-12 top-10 h-52 w-52 rounded-full"
          style={{ backgroundColor: palette.glowA }}
        />
        <View
          className="absolute right-0 top-32 h-40 w-40 rounded-full"
          style={{ backgroundColor: palette.glowB }}
        />
        <View
          className="absolute left-10 top-48 h-24 w-24 rounded-full"
          style={{ backgroundColor: palette.soft }}
        />
        <View
          className="absolute bottom-8 right-2 h-56 w-56 rounded-full"
          style={{ backgroundColor: palette.accentMuted }}
        />

        <View className="flex-1 items-center justify-center">
          <Animated.View
            className="w-full max-w-[360px] overflow-hidden rounded-[36px] border px-6 py-8"
            style={{
              backgroundColor: palette.card,
              borderColor: palette.ring,
              shadowColor: resolvedTheme === 'dark' ? '#000000' : '#0f172a',
              shadowOffset: { width: 0, height: 16 },
              shadowOpacity: resolvedTheme === 'dark' ? 0.3 : 0.1,
              shadowRadius: 28,
              transform: [{ scale: pulse }, { translateY: float }],
            }}>
            <View
              className="absolute -right-10 -top-10 h-32 w-32 rounded-full"
              style={{ backgroundColor: palette.glowA }}
            />
            <View
              className="absolute -bottom-10 left-0 h-28 w-28 rounded-full"
              style={{ backgroundColor: palette.glowB }}
            />
            <View className="gap-8">
              <View className="items-center gap-5">
                <View className="flex-row items-center gap-4">
                  <View
                    className="rounded-[24px] border px-4 py-4"
                    style={{ backgroundColor: palette.hero, borderColor: palette.ring }}>
                    <ShieldCheck color={palette.heroIcon} size={24} />
                  </View>
                  <View className="gap-2">
                    <View className="flex-row gap-2">
                      <View
                        className="rounded-2xl border px-3 py-2"
                        style={{ backgroundColor: palette.chip, borderColor: palette.ring }}>
                        <Boxes color={palette.accent} size={16} />
                      </View>
                      <View
                        className="rounded-2xl border px-3 py-2"
                        style={{ backgroundColor: palette.chip, borderColor: palette.ring }}>
                        <ReceiptText color={palette.accent} size={16} />
                      </View>
                      <View
                        className="rounded-2xl border px-3 py-2"
                        style={{ backgroundColor: palette.chip, borderColor: palette.ring }}>
                        <ChartColumnBig color={palette.accent} size={16} />
                      </View>
                    </View>
                  </View>
                </View>

                <View className="items-center gap-2">
                  <View
                    className="rounded-full border px-3 py-2"
                    style={{ backgroundColor: palette.chip, borderColor: palette.ring }}>
                    <Text className="text-[11px] font-semibold uppercase tracking-[2.5px] text-muted-foreground">
                      VyaparX Mobile
                    </Text>
                  </View>
                  <Text
                    className="text-center text-3xl font-extrabold tracking-tight"
                    style={{ color: palette.title }}>
                    Getting everything ready
                  </Text>
                  <Text className="text-center text-base leading-6" style={{ color: palette.subtitle }}>
                    Secure session restore, business context, and fresh data sync are in progress for this workspace.
                  </Text>
                </View>
              </View>

              <View className="gap-4">
                <View
                  className="flex-row items-center gap-3 rounded-[24px] border px-4 py-4"
                  style={{ backgroundColor: palette.statusBg, borderColor: palette.ring }}>
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
