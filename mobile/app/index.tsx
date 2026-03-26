import { Redirect } from "expo-router";

import { FullScreenLoader } from "../src/components/full-screen-loader";
import { useAuthStore } from "../src/store/auth-store";

export default function IndexScreen() {
  const { hasHydrated, isAuthenticated, session } = useAuthStore();

  if (!hasHydrated) {
    return <FullScreenLoader label="Loading VyaparX Mobile..." />;
  }

  if (isAuthenticated) {
    if (!session?.business_id) {
      return <Redirect href="/business-setup" />;
    }

    return <Redirect href="/(app)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
