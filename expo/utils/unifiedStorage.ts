import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const unifiedStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return null;
      } catch (error) {
        console.warn('localStorage not available:', error);
        return null;
      }
    }
    return AsyncStorage.getItem(key);
  },
  
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
        return;
      } catch (error) {
        console.warn('localStorage not available:', error);
        return;
      }
    }
    return AsyncStorage.setItem(key, value);
  },
  
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
        return;
      } catch (error) {
        console.warn('localStorage not available:', error);
        return;
      }
    }
    return AsyncStorage.removeItem(key);
  },
  
  async clear(): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.clear();
        }
        return;
      } catch (error) {
        console.warn('localStorage not available:', error);
        return;
      }
    }
    return AsyncStorage.clear();
  },

  async getAllKeys(): Promise<string[]> {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const keys: string[] = [];
          for (let i = 0; i < window.localStorage.length; i++) {
            const k = window.localStorage.key(i);
            if (k) keys.push(k);
          }
          return keys;
        }
        return [];
      } catch (error) {
        console.warn('localStorage not available:', error);
        return [];
      }
    }
    const keys = await AsyncStorage.getAllKeys();
    return [...keys];
  },
};
