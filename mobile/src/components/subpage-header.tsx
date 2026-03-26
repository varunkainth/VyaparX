import { Pressable, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { useAppTheme } from '@/theme/theme-provider';

export function SubpageHeader({
  backHref,
  eyebrow,
  subtitle,
  title,
}: {
  backHref: Href;
  eyebrow: string;
  subtitle: string;
  title: string;
}) {
  const router = useRouter();
  const { resolvedTheme } = useAppTheme();

  return (
    <View className="gap-4">
      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        className="h-11 w-11 items-center justify-center rounded-full border border-border bg-card"
        onPress={() => router.replace(backHref)}
        style={{
          shadowColor: resolvedTheme === 'dark' ? '#000000' : '#0f172a',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: resolvedTheme === 'dark' ? 0.18 : 0.08,
          shadowRadius: 12,
        }}>
        <ChevronLeft color={resolvedTheme === 'dark' ? '#f8fafc' : '#0f172a'} size={20} />
      </Pressable>
      <View className="gap-2">
        <Text className="text-sm uppercase tracking-[2px] text-muted-foreground">{eyebrow}</Text>
        <Text className="text-3xl font-extrabold tracking-tight text-foreground">{title}</Text>
        <Text className="text-base leading-6 text-muted-foreground">{subtitle}</Text>
      </View>
    </View>
  );
}
