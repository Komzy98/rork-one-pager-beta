import { useState, useEffect, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import * as WebBrowser from 'expo-web-browser';
import { AuthUser, LoginCredentials, SignupCredentials } from '@/types/habit';
import { SupabaseUserSync } from '@/utils/supabaseUserSync';
import { setSyncUserId } from '@/utils/supabaseSync';

if (Platform.OS !== 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

let LocalAuthentication: typeof import('expo-local-authentication') | null = null;
if (Platform.OS !== 'web') {
  try {
    LocalAuthentication = require('expo-local-authentication');
  } catch {
    console.log('expo-local-authentication not available');
  }
}

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const BIOMETRIC_CREDENTIALS_KEY = 'biometric_credentials';

const AUTH_STORAGE_KEY = '@auth_user';
const USERS_STORAGE_KEY = '@users_db';

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';

const googleDiscovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

interface StoredUser {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  name: string;
  avatar?: string;
  createdAt: string;
  lastLoginAt: string;
  isGuest?: boolean;
}

type BiometricType = 'FaceID' | 'TouchID' | 'Fingerprint' | 'Iris' | 'None';

const getUsersDb = async (): Promise<StoredUser[]> => {
  try {
    const stored = await AsyncStorage.getItem(USERS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting users db:', error);
    return [];
  }
};

const saveUsersDb = async (users: StoredUser[]) => {
  try {
    await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (error) {
    console.error('Error saving users db:', error);
  }
};

const createDemoUserIfNeeded = async () => {
  try {
    const users = await getUsersDb();
    const demoEmail = 'demo@example.com';
    const existingUser = users.find(u => u.email.toLowerCase() === demoEmail);
    if (existingUser) {
      console.log('✅ Demo user already exists');
      return;
    }
    const demoUser: StoredUser = {
      id: `user_demo_${Date.now()}`,
      email: demoEmail,
      password: 'demo123',
      firstName: 'Demo',
      lastName: 'User',
      name: 'Demo User',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
    const updatedUsers = [...users, demoUser];
    await saveUsersDb(updatedUsers);
    console.log('🎉 Demo user created (demo@example.com / demo123)');
  } catch (error) {
    console.error('💥 Error creating demo user:', error);
  }
};

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [firebaseSync, setFirebaseSync] = useState<SupabaseUserSync | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(false);

  const [biometricAvailable, setBiometricAvailable] = useState<boolean>(false);
  const [biometricEnabled, setBiometricEnabled] = useState<boolean>(false);
  const [biometricType, setBiometricType] = useState<BiometricType>('None');

  useEffect(() => {
    const checkBiometricAvailability = async () => {
      if (Platform.OS === 'web') {
        setBiometricAvailable(false);
        setBiometricType('None');
        return;
      }
      try {
        const compatible = await LocalAuthentication!.hasHardwareAsync();
        const enrolled = await LocalAuthentication!.isEnrolledAsync();
        const available = compatible && enrolled;
        setBiometricAvailable(available);
        if (available) {
          const supportedTypes = await LocalAuthentication!.supportedAuthenticationTypesAsync();
          if (supportedTypes.includes(LocalAuthentication!.AuthenticationType.FACIAL_RECOGNITION)) {
            setBiometricType('FaceID');
          } else if (supportedTypes.includes(LocalAuthentication!.AuthenticationType.FINGERPRINT)) {
            setBiometricType(Platform.OS === 'ios' ? 'TouchID' : 'Fingerprint');
          } else if (supportedTypes.includes(LocalAuthentication!.AuthenticationType.IRIS)) {
            setBiometricType('Iris');
          }
          const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
          setBiometricEnabled(enabled === 'true');
        }
      } catch (error) {
        console.error('🔒 Error checking biometric availability:', error);
        setBiometricAvailable(false);
      }
    };
    void checkBiometricAvailability();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const initialize = async () => {
      try {
        const cachedUser = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (cachedUser && isMounted) {
          const parsedUser = JSON.parse(cachedUser);
          console.log('📱 Found cached user:', parsedUser.email);
          setUser(parsedUser);
          setIsGuest(false);
        }
        await createDemoUserIfNeeded();
      } catch (error) {
        console.error('💥 Error initializing auth:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsInitialized(true);
          console.log('✅ Auth state resolved, app ready');
        }
      }
    };
    void initialize();
    return () => { isMounted = false; };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🔐 Login attempt for:', credentials.email);
      setIsLoading(true);
      const users = await getUsersDb();
      const foundUser = users.find(u => u.email.toLowerCase() === credentials.email.toLowerCase());
      if (!foundUser) {
        return { success: false, error: 'Invalid email or password' };
      }
      if (foundUser.password !== credentials.password) {
        return { success: false, error: 'Invalid email or password' };
      }
      const authUser: AuthUser = {
        id: foundUser.id,
        email: foundUser.email,
        name: foundUser.name,
        avatar: foundUser.avatar,
        isAuthenticated: true
      };
      setIsGuest(false);
      setUser(authUser);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
      try {
        const newSync = new SupabaseUserSync(foundUser.id);
        setFirebaseSync(newSync);
        setAutoSyncEnabled(true);
        void setSyncUserId(foundUser.id);
      } catch (syncError) {
        console.log('Supabase sync setup skipped:', syncError);
      }
      console.log('Login successful');
      return { success: true };
    } catch (error) {
      console.error('💥 Login error:', error);
      return { success: false, error: 'Login failed' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(async (credentials: SignupCredentials): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const users = await getUsersDb();
      const existingUser = users.find(u => u.email.toLowerCase() === credentials.email.toLowerCase());
      if (existingUser) {
        return { success: false, error: 'An account with this email already exists' };
      }
      if (credentials.password.length < 6) {
        return { success: false, error: 'Password should be at least 6 characters' };
      }
      const displayName = `${credentials.firstName} ${credentials.lastName}`;
      const newUser: StoredUser = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: credentials.email.toLowerCase(),
        password: credentials.password,
        firstName: credentials.firstName,
        lastName: credentials.lastName,
        name: displayName,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      await saveUsersDb([...users, newUser]);
      const authUser: AuthUser = {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        isAuthenticated: true,
      };
      setIsGuest(false);
      setUser(authUser);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
      console.log('✅ Signup successful:', authUser.email);
      return { success: true };
    } catch (error: any) {
      console.error('💥 Signup error:', error.message);
      return { success: false, error: 'Signup failed' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (firebaseSync) {
        firebaseSync.cleanup();
        setFirebaseSync(null);
      }
      setAutoSyncEnabled(false);
      try {
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
        await AsyncStorage.removeItem('biometric_enabled');
        await AsyncStorage.removeItem('biometric_credentials');
        await AsyncStorage.removeItem('imported_calendars');
        await AsyncStorage.removeItem('selected_eventkit_calendars');
        await AsyncStorage.removeItem('eventkit_permissions_granted');
      } catch (error) {
        console.log('⚠️ Failed to clear cached auth data:', error);
      }
      setUser(null);
      setFirebaseUser(null);
      setIsGuest(false);
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('💥 Logout error:', error);
    }
  }, [firebaseSync]);

  const continueAsGuest = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const guestUser: AuthUser = {
        id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: 'guest@example.com',
        name: 'Guest User',
        isAuthenticated: true
      };
      setUser(guestUser);
      setIsGuest(true);
      console.log('✅ Guest session created');
      return { success: true };
    } catch (error) {
      console.error('💥 Guest session error:', error);
      return { success: false, error: 'Failed to create guest session' };
    }
  }, []);

  const convertGuestToUser = useCallback(async (credentials: SignupCredentials): Promise<{ success: boolean; error?: string }> => {
    if (!isGuest) {
      return { success: false, error: 'Not a guest user' };
    }
    try {
      const users = await getUsersDb();
      const existingUser = users.find(u => u.email.toLowerCase() === credentials.email.toLowerCase());
      if (existingUser) {
        return { success: false, error: 'User already exists' };
      }
      const newUser: StoredUser = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: credentials.email.toLowerCase(),
        password: credentials.password,
        firstName: credentials.firstName,
        lastName: credentials.lastName,
        name: `${credentials.firstName} ${credentials.lastName}`,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
      await saveUsersDb([...users, newUser]);
      const authUser: AuthUser = {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        avatar: newUser.avatar,
        isAuthenticated: true
      };
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
      setUser(authUser);
      setIsGuest(false);
      return { success: true };
    } catch (error) {
      console.error('💥 Convert guest error:', error);
      return { success: false, error: 'Failed to convert guest account' };
    }
  }, [isGuest]);

  const updateUser = useCallback(async (updates: Partial<AuthUser>) => {
    if (!user) return;
    try {
      const updatedUser = { ...user, ...updates };
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
      setUser(updatedUser);
      const users = await getUsersDb();
      const updatedUsers = users.map(u =>
        u.id === user.id
          ? { ...u, name: updatedUser.name, avatar: updatedUser.avatar }
          : u
      );
      await saveUsersDb(updatedUsers);
    } catch (error) {
      console.error('Update user error:', error);
    }
  }, [user]);

  const deleteAccount = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'No user logged in' };
    try {
      const users = await getUsersDb();
      await saveUsersDb(users.filter(u => u.id !== user.id));
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      await AsyncStorage.removeItem('biometric_enabled');
      await AsyncStorage.removeItem('biometric_credentials');
      await AsyncStorage.removeItem('@user_profile');
      setUser(null);
      return { success: true };
    } catch (error) {
      console.error('Delete account error:', error);
      return { success: false, error: 'Failed to delete account' };
    }
  }, [user]);

  const createDemoUser = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      await createDemoUserIfNeeded();
      return { success: true };
    } catch {
      return { success: false, error: 'Failed to create demo user' };
    }
  }, []);

  const clearAllData = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      await AsyncStorage.removeItem(USERS_STORAGE_KEY);
      await AsyncStorage.removeItem('@user_profile');
      await AsyncStorage.removeItem('biometric_enabled');
      await AsyncStorage.removeItem('biometric_credentials');
      setUser(null);
      console.log('🧹 All auth data cleared');
      return { success: true };
    } catch (error) {
      console.error('💥 Error clearing data:', error);
      return { success: false, error: 'Failed to clear data' };
    }
  }, []);

  const getFirebaseSync = useCallback(() => firebaseSync, [firebaseSync]);
  const isAutoSyncEnabled = useCallback(() => autoSyncEnabled, [autoSyncEnabled]);

  const enableBiometric = useCallback(async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
    if (Platform.OS === 'web') {
      return { success: false, error: 'Biometric authentication not available on web' };
    }
    if (!biometricAvailable) {
      return { success: false, error: 'Biometric authentication not available on this device' };
    }
    try {
      await AsyncStorage.setItem(BIOMETRIC_CREDENTIALS_KEY, JSON.stringify(credentials));
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
      setBiometricEnabled(true);
      return { success: true };
    } catch (error) {
      console.error('💥 Error enabling biometric:', error);
      return { success: false, error: 'Failed to enable biometric authentication' };
    }
  }, [biometricAvailable]);

  const disableBiometric = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      await AsyncStorage.removeItem(BIOMETRIC_CREDENTIALS_KEY);
      await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY);
      setBiometricEnabled(false);
      return { success: true };
    } catch (error) {
      console.error('💥 Error disabling biometric:', error);
      return { success: false, error: 'Failed to disable biometric authentication' };
    }
  }, []);

  const authenticateWithBiometrics = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (Platform.OS === 'web') {
      return { success: false, error: 'Biometric authentication not available on web' };
    }
    if (!biometricAvailable || !biometricEnabled) {
      return { success: false, error: 'Biometric authentication not available or enabled' };
    }
    try {
      const result = await LocalAuthentication!.authenticateAsync({
        promptMessage: biometricType === 'FaceID' ? 'Sign in with Face ID' : 'Sign in with fingerprint',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
        fallbackLabel: 'Use Password',
      });
      if (result.success) {
        const storedCredentials = await AsyncStorage.getItem(BIOMETRIC_CREDENTIALS_KEY);
        if (!storedCredentials) {
          return { success: false, error: 'No stored credentials found' };
        }
        const credentials: LoginCredentials = JSON.parse(storedCredentials);
        return await login(credentials);
      }
      let errorMessage = 'Authentication failed';
      if (result.error === 'user_cancel') errorMessage = 'Authentication cancelled';
      else if (result.error === 'user_fallback') errorMessage = 'User chose password fallback';
      else if (result.error === 'lockout') errorMessage = 'Too many attempts. Try again later.';
      return { success: false, error: errorMessage };
    } catch (error) {
      console.error('💥 Biometric authentication error:', error);
      return { success: false, error: 'Biometric authentication failed' };
    }
  }, [biometricAvailable, biometricEnabled, biometricType, login]);

  const hasBiometricCredentials = useCallback(async (): Promise<boolean> => {
    try {
      const credentials = await AsyncStorage.getItem(BIOMETRIC_CREDENTIALS_KEY);
      return !!credentials;
    } catch {
      return false;
    }
  }, []);

  const loginWithGoogle = useCallback(async (googleUser: { id: string; email: string; name: string; picture?: string }): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🔐 Google login attempt for:', googleUser.email);
      setIsLoading(true);

      const users = await getUsersDb();
      let foundUser = users.find(u => u.email.toLowerCase() === googleUser.email.toLowerCase());

      if (!foundUser) {
        const nameParts = googleUser.name.split(' ');
        const firstName = nameParts[0] || 'Google';
        const lastName = nameParts.slice(1).join(' ') || 'User';

        const newUser: StoredUser = {
          id: `google_${googleUser.id}`,
          email: googleUser.email.toLowerCase(),
          password: `__google_oauth_${googleUser.id}`,
          firstName,
          lastName,
          name: googleUser.name,
          avatar: googleUser.picture,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };
        await saveUsersDb([...users, newUser]);
        foundUser = newUser;
        console.log('✅ New Google user created:', googleUser.email);
      } else {
        foundUser.lastLoginAt = new Date().toISOString();
        if (googleUser.picture && !foundUser.avatar) {
          foundUser.avatar = googleUser.picture;
        }
        await saveUsersDb(users.map(u => u.id === foundUser!.id ? foundUser! : u));
      }

      const authUser: AuthUser = {
        id: foundUser.id,
        email: foundUser.email,
        name: foundUser.name,
        avatar: foundUser.avatar || googleUser.picture,
        isAuthenticated: true,
      };

      setIsGuest(false);
      setUser(authUser);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));

      try {
        const newSync = new SupabaseUserSync(foundUser.id);
        setFirebaseSync(newSync);
        setAutoSyncEnabled(true);
        void setSyncUserId(foundUser.id);
      } catch (syncError) {
        console.log('Supabase sync setup skipped:', syncError);
      }

      console.log('Google login successful');
      return { success: true };
    } catch (error) {
      console.error('💥 Google login error:', error);
      return { success: false, error: 'Google sign-in failed. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const biometricAuth = useMemo(() => ({
    isAvailable: biometricAvailable,
    isEnabled: biometricEnabled,
    biometricType,
    enableBiometric,
    disableBiometric,
    authenticateWithBiometrics,
    hasBiometricCredentials,
  }), [biometricAvailable, biometricEnabled, biometricType, enableBiometric, disableBiometric, authenticateWithBiometrics, hasBiometricCredentials]);

  const googleAuthConfig = useMemo(() => ({
    clientId: GOOGLE_CLIENT_ID,
    discovery: googleDiscovery,
    isConfigured: !!GOOGLE_CLIENT_ID,
  }), []);

  return useMemo(() => ({
    user,
    isLoading,
    isInitialized,
    isAuthenticated: !!user?.isAuthenticated,
    isGuest,
    login,
    signup,
    logout,
    loginWithGoogle,
    continueAsGuest,
    convertGuestToUser,
    updateUser,
    deleteAccount,
    createDemoUser,
    clearAllData,
    getFirebaseSync,
    isAutoSyncEnabled,
    firebaseUser,
    biometricAuth,
    googleAuthConfig,
  }), [user, isLoading, isInitialized, isGuest, login, signup, logout, loginWithGoogle, continueAsGuest, convertGuestToUser, updateUser, deleteAccount, createDemoUser, clearAllData, getFirebaseSync, isAutoSyncEnabled, firebaseUser, biometricAuth, googleAuthConfig]);
});
