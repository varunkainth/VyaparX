import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const PERMISSION_PROMPT_KEY = 'vyaparx_mobile_permissions_prompted';

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

export async function hasHandledPermissionsPrompt() {
  return (await storage.getItem(PERMISSION_PROMPT_KEY)) === 'true';
}

export async function markPermissionsPromptHandled() {
  await storage.setItem(PERMISSION_PROMPT_KEY, 'true');
}
