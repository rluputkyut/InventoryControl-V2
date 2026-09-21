import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// expo-secure-store is a native-only module; on web we fall back to localStorage
// so the same auth/cart code paths work when the app runs in a browser.
const isWeb = Platform.OS === 'web';

export const secureStorage = {
  async getItemAsync(key: string): Promise<string | null> {
    if (isWeb) return window.localStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async setItemAsync(key: string, value: string): Promise<void> {
    if (isWeb) {
      window.localStorage.setItem(key, value);
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },
  async deleteItemAsync(key: string): Promise<void> {
    if (isWeb) {
      window.localStorage.removeItem(key);
      return;
    }
    return SecureStore.deleteItemAsync(key);
  },
};