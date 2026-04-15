import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const YOUNIFY_ACCESS_TOKEN_KEY = 'younify_access_token';
const YOUNIFY_REFRESH_TOKEN_KEY = 'younify_refresh_token';
const YOUNIFY_TOKEN_EXPIRY_KEY = 'younify_token_expiry';
const YOUNIFY_USER_ID_KEY = 'younify_user_id';

export interface YounifyTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

async function setItem(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.error(`❌ [SecureStore] Failed to set ${key}:`, error);
  }
}

async function getItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error(`❌ [SecureStore] Failed to get ${key}:`, error);
    return null;
  }
}

async function deleteItem(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error(`❌ [SecureStore] Failed to delete ${key}:`, error);
  }
}

export const secureTokenStorage = {
  async storeTokens(tokens: YounifyTokens): Promise<void> {
    console.log('🔐 [SecureStore] Storing Younify tokens');
    await Promise.all([
      setItem(YOUNIFY_ACCESS_TOKEN_KEY, tokens.accessToken),
      setItem(YOUNIFY_REFRESH_TOKEN_KEY, tokens.refreshToken),
      setItem(YOUNIFY_TOKEN_EXPIRY_KEY, String(tokens.expiresAt)),
    ]);
    console.log('✅ [SecureStore] Younify tokens stored successfully');
  },

  async getTokens(): Promise<YounifyTokens | null> {
    const [accessToken, refreshToken, expiryStr] = await Promise.all([
      getItem(YOUNIFY_ACCESS_TOKEN_KEY),
      getItem(YOUNIFY_REFRESH_TOKEN_KEY),
      getItem(YOUNIFY_TOKEN_EXPIRY_KEY),
    ]);

    if (!accessToken || !refreshToken || !expiryStr) {
      console.log('ℹ️ [SecureStore] No Younify tokens found');
      return null;
    }

    return {
      accessToken,
      refreshToken,
      expiresAt: parseInt(expiryStr, 10),
    };
  },

  async clearTokens(): Promise<void> {
    console.log('🗑️ [SecureStore] Clearing Younify tokens');
    await Promise.all([
      deleteItem(YOUNIFY_ACCESS_TOKEN_KEY),
      deleteItem(YOUNIFY_REFRESH_TOKEN_KEY),
      deleteItem(YOUNIFY_TOKEN_EXPIRY_KEY),
      deleteItem(YOUNIFY_USER_ID_KEY),
    ]);
    console.log('✅ [SecureStore] Younify tokens cleared');
  },

  async storeUserId(userId: string): Promise<void> {
    await setItem(YOUNIFY_USER_ID_KEY, userId);
  },

  async getUserId(): Promise<string | null> {
    return getItem(YOUNIFY_USER_ID_KEY);
  },

  async isTokenExpired(): Promise<boolean> {
    const expiryStr = await getItem(YOUNIFY_TOKEN_EXPIRY_KEY);
    if (!expiryStr) return true;
    const expiresAt = parseInt(expiryStr, 10);
    const buffer = 5 * 60 * 1000;
    return Date.now() >= expiresAt - buffer;
  },
};
