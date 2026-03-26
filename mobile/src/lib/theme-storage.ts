import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const THEME_STORAGE_KEY = 'vyaparx_mobile_theme';

const webStorage = {
  async getItem(key: string) {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  },
  async setItem(key: string, value: string) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, value);
  },
};

const storage =
  Platform.OS === 'web'
    ? webStorage
    : {
        getItem: SecureStore.getItemAsync,
        setItem: SecureStore.setItemAsync,
      };

export async function restoreThemeMode() {
  const value = await storage.getItem(THEME_STORAGE_KEY);

  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }

  return 'system';
}

export async function persistThemeMode(value: 'light' | 'dark' | 'system') {
  await storage.setItem(THEME_STORAGE_KEY, value);
}
