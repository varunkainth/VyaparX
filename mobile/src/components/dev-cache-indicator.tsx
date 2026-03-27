import * as React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';

export type CacheDebugState = 'live' | 'refreshing' | 'cached' | 'stale' | 'empty';

export function DevCacheIndicator({
  detail,
  label,
  state,
}: {
  detail?: string;
  label: string;
  state: CacheDebugState;
}) {
  if (!__DEV__) {
    return null;
  }

  const palette =
    state === 'live'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
      : state === 'refreshing'
        ? 'border-sky-500/30 bg-sky-500/10 text-sky-700'
        : state === 'cached'
          ? 'border-violet-500/30 bg-violet-500/10 text-violet-700'
          : state === 'stale'
            ? 'border-amber-500/30 bg-amber-500/10 text-amber-700'
            : 'border-border/80 bg-muted/30 text-muted-foreground';

  return (
    <View className={`self-start rounded-full border px-3 py-1.5 ${palette}`}>
      <Text className="text-[11px] font-semibold uppercase tracking-[1px]">
        {label}: {state}
        {detail ? ` | ${detail}` : ''}
      </Text>
    </View>
  );
}
