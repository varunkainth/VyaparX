import "../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PortalHost } from "@rn-primitives/portal";
import * as React from "react";
import { Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "../src/components/auth-provider";
import { ENV_CONFIG_ERROR } from "../src/lib/env";
import { AppThemeProvider, useAppTheme } from "../src/theme/theme-provider";

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
          <AppShell />
        </AuthProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}

function AppShell() {
  const { resolvedTheme } = useAppTheme();
  const [showSplashOverlay, setShowSplashOverlay] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplashOverlay(false);
    }, 900);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }} />
      <PortalHost />
      {showSplashOverlay ? <LaunchSplash /> : null}
    </>
  );
}

function LaunchSplash() {
  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        pointerEvents: "none",
        backgroundColor: "#ffffff",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
      }}>
      <View
        style={{
          width: 88,
          height: 88,
          borderRadius: 28,
          backgroundColor: "#e6f4fe",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}>
        <Text style={{ color: "#0f172a", fontSize: 28, fontWeight: "800" }}>V</Text>
      </View>
      <Text style={{ color: "#0f172a", fontSize: 24, fontWeight: "800", marginBottom: 6 }}>
        VyaparX
      </Text>
      <Text style={{ color: "#64748b", fontSize: 14 }}>Business billing and reporting</Text>
    </View>
  );
}
