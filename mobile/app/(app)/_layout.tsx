import * as React from 'react';
import {
  Animated,
  Pressable,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { LucideIcon } from 'lucide-react-native';
import { BookUser, Boxes, House, ReceiptText, SunMoon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FullScreenLoader } from '@/components/full-screen-loader';
import { PermissionsGate } from '@/components/permissions-gate';
import { useAuthStore } from '@/store/auth-store';
import { useAppTheme } from '@/theme/theme-provider';

const TAB_META: Record<string, { icon: LucideIcon; label: string }> = {
  customers: { icon: BookUser, label: 'Customers' },
  '(app)/customers': { icon: BookUser, label: 'Customers' },
  invoices: { icon: ReceiptText, label: 'Invoices' },
  '(app)/invoices': { icon: ReceiptText, label: 'Invoices' },
  index: { icon: House, label: 'Home' },
  '(app)/index': { icon: House, label: 'Home' },
  inventory: { icon: Boxes, label: 'Inventory' },
  '(app)/inventory': { icon: Boxes, label: 'Inventory' },
  more: { icon: SunMoon, label: 'More' },
  '(app)/more': { icon: SunMoon, label: 'More' },
};

const PRIMARY_TAB_NAMES = new Set([
  'customers',
  '(app)/customers',
  'invoices',
  '(app)/invoices',
  'index',
  '(app)/index',
  'inventory',
  '(app)/inventory',
  'more',
  '(app)/more',
]);

const TAB_PARENT_BY_ROUTE: Record<string, string> = {
  business: 'more',
  '(app)/business': 'more',
  'business-settings': 'more',
  '(app)/business-settings': 'more',
  ledger: 'customers',
  '(app)/ledger': 'customers',
  payments: 'invoices',
  '(app)/payments': 'invoices',
  profile: 'more',
  '(app)/profile': 'more',
  reports: 'more',
  '(app)/reports': 'more',
  settings: 'more',
  '(app)/settings': 'more',
};

export default function AppLayout() {
  const { hasHydrated, isAuthenticated, isLoading, session } = useAuthStore();
  const { resolvedTheme } = useAppTheme();
  const insets = useSafeAreaInsets();

  if (!hasHydrated || isLoading) {
    return <FullScreenLoader label="Preparing workspace..." />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!session?.business_id) {
    return <Redirect href="/business-setup" />;
  }

  return (
    <PermissionsGate>
      <Tabs
        initialRouteName="index"
        screenOptions={{ headerShown: false }}
        tabBar={(props) => (
          <AppTabBar {...props} bottomInset={Math.max(insets.bottom, 10)} resolvedTheme={resolvedTheme} />
        )}>
        <Tabs.Screen name="customers" />
        <Tabs.Screen name="invoices" />
        <Tabs.Screen name="index" />
        <Tabs.Screen name="inventory" />
        <Tabs.Screen name="more" />
        <Tabs.Screen name="ledger" options={{ href: null }} />
        <Tabs.Screen name="payments" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
        <Tabs.Screen name="business" options={{ href: null }} />
        <Tabs.Screen name="business-settings" options={{ href: null }} />
        <Tabs.Screen name="reports" options={{ href: null }} />
      </Tabs>
    </PermissionsGate>
  );
}

function AppTabBar({
  state,
  descriptors,
  navigation,
  bottomInset,
  resolvedTheme,
}: BottomTabBarProps & {
  bottomInset: number;
  resolvedTheme: 'light' | 'dark';
}) {
  const [dockWidth, setDockWidth] = React.useState(0);
  const indicatorX = React.useRef(new Animated.Value(0)).current;
  const visibleRoutes = React.useMemo(
    () => state.routes.filter((route) => PRIMARY_TAB_NAMES.has(route.name)),
    [state.routes]
  );

  const palette = resolvedTheme === 'dark'
    ? {
        dockBackground: 'rgba(15, 15, 15, 0.96)',
        dockBorder: 'rgba(255,255,255,0.08)',
        indicatorBackground: 'rgba(255,255,255,0.08)',
        indicatorBorder: 'rgba(255,255,255,0.10)',
        active: '#f8fafc',
        inactive: '#94a3b8',
        shadow: '#000000',
      }
    : {
        dockBackground: 'rgba(255, 255, 255, 0.97)',
        dockBorder: 'rgba(15,23,42,0.08)',
        indicatorBackground: 'rgba(15,23,42,0.06)',
        indicatorBorder: 'rgba(15,23,42,0.08)',
        active: '#0f172a',
        inactive: '#64748b',
        shadow: '#0f172a',
      };

  const activeRoute = state.routes[state.index];
  const activeRouteName = activeRoute?.name ?? 'index';
  const activeAnchorName =
    TAB_PARENT_BY_ROUTE[activeRouteName] ??
    TAB_PARENT_BY_ROUTE[activeRouteName.split('/').pop() ?? 'index'] ??
    activeRouteName;
  const activeVisibleIndex = Math.max(
    visibleRoutes.findIndex(
      (route) =>
        route.key === activeRoute?.key ||
        route.name === activeAnchorName ||
        route.name.split('/').pop() === activeAnchorName
    ),
    0
  );
  const itemCount = visibleRoutes.length;
  const innerPadding = 10;
  const itemWidth = dockWidth > innerPadding * 2 ? (dockWidth - innerPadding * 2) / itemCount : 0;
  const indicatorWidth = Math.max(itemWidth - 10, 0);
  const indicatorLeft =
    itemWidth > 0 ? innerPadding + activeVisibleIndex * itemWidth + (itemWidth - indicatorWidth) / 2 : 0;

  React.useEffect(() => {
    Animated.spring(indicatorX, {
      damping: 18,
      mass: 0.9,
      stiffness: 180,
      toValue: indicatorLeft,
      useNativeDriver: true,
    }).start();
  }, [indicatorLeft, indicatorX]);

  function onDockLayout(event: LayoutChangeEvent) {
    setDockWidth(event.nativeEvent.layout.width);
  }

  return (
    <View pointerEvents="box-none" style={{ bottom: bottomInset, left: 14, position: 'absolute', right: 14 }}>
      <View
        onLayout={onDockLayout}
        style={{
          backgroundColor: palette.dockBackground,
          borderColor: palette.dockBorder,
          borderRadius: 30,
          borderWidth: 1,
          overflow: 'hidden',
          paddingBottom: 12,
          paddingHorizontal: innerPadding,
          paddingTop: 10,
          shadowColor: palette.shadow,
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: resolvedTheme === 'dark' ? 0.38 : 0.12,
          shadowRadius: 24,
        }}>
        {indicatorWidth > 0 ? (
          <Animated.View
            style={{
              backgroundColor: palette.indicatorBackground,
              borderColor: palette.indicatorBorder,
              borderRadius: 24,
              borderWidth: 1,
              bottom: 14,
              height: 54,
              position: 'absolute',
              transform: [{ translateX: indicatorX }],
              width: indicatorWidth,
            }}
          />
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {visibleRoutes.map((route) => {
            const focused = state.routes[state.index]?.key === route.key;
            const { options } = descriptors[route.key];
            const meta =
              TAB_META[route.name] ??
              TAB_META[route.name.split('/').pop() ?? 'index'] ??
              TAB_META.index;
            const IconComponent = meta.icon;

            const onPress = () => {
              const event = navigation.emit({
                canPreventDefault: true,
                target: route.key,
                type: 'tabPress',
              });

              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                target: route.key,
                type: 'tabLongPress',
              });
            };

            return (
              <Pressable
                key={route.key}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                onLongPress={onLongPress}
                onPress={onPress}
                style={tabButtonStyle}>
                <View style={[tabInnerStyle, itemWidth ? { minWidth: itemWidth } : null]}>
                  <View style={[iconWrapStyle, focused ? focusedIconWrapStyle : null]}>
                    <IconComponent color={focused ? palette.active : palette.inactive} size={19} />
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      tabLabelStyle,
                      { color: focused ? palette.active : palette.inactive },
                      focused ? focusedTabLabelStyle : null,
                    ]}>
                    {meta.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const tabButtonStyle: StyleProp<ViewStyle> = {
  alignItems: 'center',
  flex: 1,
  height: 64,
  justifyContent: 'center',
};

const tabInnerStyle: StyleProp<ViewStyle> = {
  alignItems: 'center',
  gap: 4,
  justifyContent: 'center',
};

const iconWrapStyle: StyleProp<ViewStyle> = {
  borderRadius: 16,
  paddingHorizontal: 12,
  paddingVertical: 6,
};

const focusedIconWrapStyle: StyleProp<ViewStyle> = {
  transform: [{ translateY: -2 }],
};

const tabLabelStyle: StyleProp<TextStyle> = {
  fontSize: 10,
  letterSpacing: 0.3,
  textAlign: 'center',
  width: 68,
};

const focusedTabLabelStyle: StyleProp<TextStyle> = {
  fontWeight: '600',
};
