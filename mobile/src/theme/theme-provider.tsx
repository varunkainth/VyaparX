import { ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useColorScheme as useNativewindColorScheme, vars } from 'nativewind';
import * as React from 'react';
import { Appearance, useColorScheme as useSystemColorScheme, View } from 'react-native';

import { persistThemeMode, restoreThemeMode } from '@/lib/theme-storage';
import { NAV_THEME, THEME } from '@/theme/theme';

type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  resolvedTheme: ResolvedTheme;
  setThemeMode: (value: ThemeMode) => void;
  themeMode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

const createThemeVars = (theme: typeof THEME.light) =>
  vars({
    '--accent': theme.accent,
    '--accent-foreground': theme.accentForeground,
    '--background': theme.background,
    '--border': theme.border,
    '--card': theme.card,
    '--card-foreground': theme.cardForeground,
    '--destructive': theme.destructive,
    '--destructive-foreground': theme.destructiveForeground,
    '--foreground': theme.foreground,
    '--input': theme.input,
    '--muted': theme.muted,
    '--muted-foreground': theme.mutedForeground,
    '--popover': theme.popover,
    '--popover-foreground': theme.popoverForeground,
    '--primary': theme.primary,
    '--primary-foreground': theme.primaryForeground,
    '--radius': theme.radius,
    '--ring': theme.ring,
    '--secondary': theme.secondary,
    '--secondary-foreground': theme.secondaryForeground,
  });

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useSystemColorScheme() ?? Appearance.getColorScheme();
  const { setColorScheme } = useNativewindColorScheme();
  const [themeMode, setThemeMode] = React.useState<ThemeMode>('system');
  const [hasHydratedTheme, setHasHydratedTheme] = React.useState(false);

  const resolvedTheme: ResolvedTheme =
    themeMode === 'system' ? (systemColorScheme === 'dark' ? 'dark' : 'light') : themeMode;

  React.useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      const storedThemeMode = await restoreThemeMode();

      if (!isMounted) {
        return;
      }

      setThemeMode(storedThemeMode);
      setHasHydratedTheme(true);
    };

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  React.useEffect(() => {
    setColorScheme(themeMode === 'system' ? 'system' : themeMode);
  }, [setColorScheme, themeMode]);

  React.useEffect(() => {
    if (!hasHydratedTheme) {
      return;
    }

    void persistThemeMode(themeMode);
  }, [hasHydratedTheme, themeMode]);

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      resolvedTheme,
      setThemeMode: (nextThemeMode) => {
        setThemeMode(nextThemeMode);
      },
      themeMode,
      toggleTheme: () =>
        setThemeMode((current) => {
          if (current === 'system') {
            return resolvedTheme === 'dark' ? 'light' : 'dark';
          }

          return current === 'dark' ? 'light' : 'dark';
        }),
    }),
    [resolvedTheme, themeMode]
  );

  return (
    <ThemeContext.Provider value={value}>
      <NavigationThemeProvider value={NAV_THEME[resolvedTheme]}>
        <View
          className={resolvedTheme === 'dark' ? 'dark flex-1 bg-background' : 'flex-1 bg-background'}
          style={createThemeVars(THEME[resolvedTheme])}>
          {children}
        </View>
      </NavigationThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = React.useContext(ThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used inside AppThemeProvider');
  }

  return context;
}
