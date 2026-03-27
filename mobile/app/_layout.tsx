import "../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PortalHost } from "@rn-primitives/portal";
import { Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "../src/components/auth-provider";
import { ENV_CONFIG_ERROR } from "../src/lib/env";
import { AppThemeProvider } from "../src/theme/theme-provider";

export default function RootLayout() {
  if (ENV_CONFIG_ERROR) {
    return (
      <SafeAreaProvider>
        <View
          style={{
            flex: 1,
            backgroundColor: "#0f172a",
            justifyContent: "center",
            paddingHorizontal: 24,
            paddingVertical: 32,
          }}>
          <Text style={{ color: "#f8fafc", fontSize: 24, fontWeight: "700", marginBottom: 12 }}>
            App configuration error
          </Text>
          <Text style={{ color: "#cbd5e1", fontSize: 15, lineHeight: 22, marginBottom: 16 }}>
            This build is missing required Expo public environment variables. Rebuild the app with the expected
            EAS environment values.
          </Text>
          <Text style={{ color: "#fda4af", fontSize: 14, lineHeight: 21 }}>
            {ENV_CONFIG_ERROR}
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }

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
