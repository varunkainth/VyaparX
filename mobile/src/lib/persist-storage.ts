import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { StateStorage } from 'zustand/middleware';

const webStorage: StateStorage = {
  getItem: async (key) => {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    return localStorage.getItem(key);
  },
  removeItem: async (key) => {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.removeItem(key);
  },
  setItem: async (key, value) => {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(key, value);
  },
};

const nativeStorage: StateStorage = {
  getItem: SecureStore.getItemAsync,
  removeItem: SecureStore.deleteItemAsync,
  setItem: SecureStore.setItemAsync,
};

export const persistStorage: StateStorage = Platform.OS === 'web' ? webStorage : nativeStorage;
