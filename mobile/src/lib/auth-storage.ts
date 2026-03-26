import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { AuthSnapshot } from "../types/auth";

const AUTH_STORAGE_KEY = "vyaparx_mobile_auth";

const webStorage = {
  async getItem(key: string) {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(key);
  },
  async setItem(key: string, value: string) {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, value);
  },
  async deleteItem(key: string) {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(key);
  },
};

const storage = Platform.OS === "web"
  ? webStorage
  : {
      getItem: SecureStore.getItemAsync,
      setItem: SecureStore.setItemAsync,
      deleteItem: SecureStore.deleteItemAsync,
    };

export async function restoreAuthSnapshot(): Promise<AuthSnapshot | null> {
  const rawValue = await storage.getItem(AUTH_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as AuthSnapshot;
  } catch {
    await storage.deleteItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export async function persistAuthSnapshot(snapshot: AuthSnapshot): Promise<void> {
  await storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(snapshot));
}

export async function clearAuthSnapshot(): Promise<void> {
  await storage.deleteItem(AUTH_STORAGE_KEY);
}
