import "../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PortalHost } from "@rn-primitives/portal";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "../src/components/auth-provider";
import { AppThemeProvider } from "../src/theme/theme-provider";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <AuthProvider>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }} />
          <PortalHost />
        </AuthProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}
