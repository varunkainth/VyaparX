import { Redirect } from "expo-router";

import { useAuthStore } from "../src/store/auth-store";

export default function IndexScreen() {
  const { hasHydrated, isAuthenticated, session } = useAuthStore();

  if (!hasHydrated) {
    return null;
  }

  if (isAuthenticated) {
    if (!session?.business_id) {
      return <Redirect href="/business-setup" />;
    }

    return <Redirect href="/(app)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
