import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from "../types/notification";

const NOTIFICATION_PREFERENCES_KEY = "notificationPreferences";

const storage =
  Platform.OS === "web"
    ? {
        getItem: async (key: string) => window.localStorage.getItem(key),
        setItem: async (key: string, value: string) => window.localStorage.setItem(key, value),
      }
    : {
        getItem: SecureStore.getItemAsync,
        setItem: SecureStore.setItemAsync,
      };

export async function restoreNotificationPreferences(): Promise<NotificationPreferences> {
  const raw = await storage.getItem(NOTIFICATION_PREFERENCES_KEY);
  if (!raw) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  try {
    return {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...JSON.parse(raw),
      types: {
        ...DEFAULT_NOTIFICATION_PREFERENCES.types,
        ...(JSON.parse(raw)?.types ?? {}),
      },
    };
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export async function persistNotificationPreferences(value: NotificationPreferences) {
  await storage.setItem(NOTIFICATION_PREFERENCES_KEY, JSON.stringify(value));
}
