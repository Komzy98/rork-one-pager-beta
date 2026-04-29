import { useState, useEffect, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import * as WebBrowser from 'expo-web-browser';
import { AuthUser, LoginCredentials, SignupCredentials } from '@/types/habit';
import { SupabaseUserSync } from '@/utils/supabaseUserSync';
import { setSyncUserId } from '@/utils/supabaseSync';
import { supabase, supabaseConfigured, supabaseUrl } from '@/utils/supabaseClient';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import * as Crypto from 'expo-crypto';

import { migrateLocalDataToSupabaseUser } from '@/utils/localToSupabaseMigration';
import { resetYounifySession, setYounifyExternalUserId } from '@/services/younify';

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

/** Supabase sign-in uses HTTPS to your project (not the local Metro/tRPC server). */
function friendlyMessageForAuthNetworkError(error: unknown): string | null {
  if (!(error instanceof Error)) {
    return null;
  }
  const msg = error.message;
  if (
    /Network request failed|Failed to fetch|Load failed|NetworkError|network connection was lost|fetch failed|ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(
      msg,
    ) ||
    (error.name === "TypeError" && /network|fetch|load|failed/i.test(msg))
  ) {
    return "Can't connect to the sign-in service. Check your internet and try again.";
  }
  return null;
}

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
  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  const [supabaseSync, setSupabaseSync] = useState<SupabaseUserSync | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(false);

  const [biometricAvailable, setBiometricAvailable] = useState<boolean>(false);
  const [biometricEnabled, setBiometricEnabled] = useState<boolean>(false);
  const [biometricType, setBiometricType] = useState<BiometricType>('None');
  const [mfaEnabled, setMfaEnabled] = useState<boolean>(false);
  const [mfaLoading, setMfaLoading] = useState<boolean>(false);

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

  /** Isolate Younify `external_id` per app user and clear SDK state on sign-out (prevents linked streaming bleeding across accounts). */
  useEffect(() => {
    if (!isInitialized) return;
    if (user?.id) {
      setYounifyExternalUserId(user.id);
    } else {
      void resetYounifySession();
    }
  }, [isInitialized, user?.id]);

  useEffect(() => {
    let isMounted = true;

    const applySupabaseSession = async (sessionUser: any) => {
      if (!sessionUser || !isMounted) return;
      if (sessionUser.email) {
        try {
          await migrateLocalDataToSupabaseUser(sessionUser.email, sessionUser.id);
        } catch (migrationError) {
          console.warn('Local->Supabase migration skipped:', migrationError);
        }
      }
      const meta = sessionUser.user_metadata || {};
      const firstName: string = meta.firstName || (meta.full_name ? String(meta.full_name).split(' ')[0] : '') || '';
      const lastName: string = meta.lastName || (meta.full_name ? String(meta.full_name).split(' ').slice(1).join(' ') : '') || '';
      const displayName: string = meta.name || meta.full_name || [firstName, lastName].filter(Boolean).join(' ') || (sessionUser.email ? String(sessionUser.email).split('@')[0] : 'User');
      const authUser: AuthUser = {
        id: sessionUser.id,
        email: sessionUser.email || '',
        name: displayName,
        avatar: meta.avatar_url || meta.picture,
        isAuthenticated: true,
      };
      setUser(authUser);
      setSupabaseUser(sessionUser);
      setIsGuest(false);
      try {
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
      } catch {}
      try {
        const newSync = new SupabaseUserSync(sessionUser.id);
        setSupabaseSync(newSync);
        setAutoSyncEnabled(true);
        void setSyncUserId(sessionUser.id);
      } catch (syncError) {
        console.log('Supabase sync setup skipped:', syncError);
      }
    };

    const initialize = async () => {
      try {
        if (supabaseConfigured) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && isMounted) {
            console.log('🔐 Restored Supabase session for:', session.user.email);
            await applySupabaseSession(session.user);
          } else {
            const cachedUser = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
            if (cachedUser && isMounted) {
              const parsedUser: AuthUser = JSON.parse(cachedUser);
              if (!parsedUser.id?.startsWith('guest_')) {
                console.log('📱 Stale cached user without Supabase session, clearing:', parsedUser.email);
                await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
              } else if (isMounted) {
                setUser(parsedUser);
                setIsGuest(true);
              }
            }
          }
        } else {
          const cachedUser = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
          if (cachedUser && isMounted) {
            const parsedUser: AuthUser = JSON.parse(cachedUser);
            console.log('📱 Found cached user (no Supabase):', parsedUser.email);
            setUser(parsedUser);
            setIsGuest(!!parsedUser.id?.startsWith('guest_'));
            if (!parsedUser.id?.startsWith('guest_')) {
              try {
                const newSync = new SupabaseUserSync(parsedUser.id);
                setSupabaseSync(newSync);
                setAutoSyncEnabled(true);
                void setSyncUserId(parsedUser.id);
              } catch {}
            }
          }
          await createDemoUserIfNeeded();
        }
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

    const sub = supabaseConfigured
      ? supabase.auth.onAuthStateChange((event, session) => {
          console.log('🔔 Supabase auth event:', event);
          if (session?.user) {
            void applySupabaseSession(session.user);
          } else if (event === 'SIGNED_OUT') {
            if (isMounted) {
              setUser(null);
              setSupabaseUser(null);
              setIsGuest(false);
              void AsyncStorage.removeItem(AUTH_STORAGE_KEY);
            }
          }
        })
      : null;

    return () => {
      isMounted = false;
      sub?.data?.subscription?.unsubscribe?.();
    };
  }, []);

  const refreshMfaStatus = useCallback(async (): Promise<{ enabled: boolean; factorId?: string }> => {
    if (!supabaseConfigured || !user || Platform.OS === 'web') {
      setMfaEnabled(false);
      return { enabled: false };
    }
    const mfaApi = (supabase.auth as any)?.mfa;
    if (!mfaApi || typeof mfaApi.listFactors !== 'function') {
      setMfaEnabled(false);
      return { enabled: false };
    }

    setMfaLoading(true);
    try {
      const { data, error } = await mfaApi.listFactors();
      if (error) {
        console.warn('MFA list factors failed:', error?.message || error);
        setMfaEnabled(false);
        return { enabled: false };
      }

      const allFactors = [
        ...(Array.isArray(data?.all) ? data.all : []),
        ...(Array.isArray(data?.totp) ? data.totp : []),
      ];
      const verified = allFactors.find((f: any) => f?.status === 'verified');
      const enabled = !!verified;
      setMfaEnabled(enabled);
      return { enabled, factorId: verified?.id };
    } catch (error) {
      console.warn('MFA status refresh failed:', error);
      setMfaEnabled(false);
      return { enabled: false };
    } finally {
      setMfaLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user || !supabaseConfigured || Platform.OS === 'web') {
      setMfaEnabled(false);
      return;
    }
    void refreshMfaStatus();
  }, [user?.id, refreshMfaStatus]);

  const startTwoFactorSetup = useCallback(async (): Promise<{
    success: boolean;
    factorId?: string;
    qrCode?: string;
    secret?: string;
    uri?: string;
    error?: string;
  }> => {
    if (!supabaseConfigured) return { success: false, error: 'Supabase is not configured' };
    if (Platform.OS === 'web') return { success: false, error: '2FA setup is only available on mobile right now' };
    if (!user) return { success: false, error: 'You must be logged in' };

    const mfaApi = (supabase.auth as any)?.mfa;
    if (!mfaApi || typeof mfaApi.enroll !== 'function') {
      return { success: false, error: 'MFA is not supported by this auth client' };
    }

    setMfaLoading(true);
    try {
      const { data, error } = await mfaApi.enroll({
        factorType: 'totp',
        friendlyName: 'One Pager',
      });
      if (error || !data?.id) {
        return { success: false, error: error?.message || 'Could not start 2FA setup' };
      }
      return {
        success: true,
        factorId: data.id,
        qrCode: data?.totp?.qr_code,
        secret: data?.totp?.secret,
        uri: data?.totp?.uri,
      };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Could not start 2FA setup' };
    } finally {
      setMfaLoading(false);
    }
  }, [user]);

  const verifyTwoFactorSetup = useCallback(async (factorId: string, code: string): Promise<{ success: boolean; error?: string }> => {
    if (!supabaseConfigured) return { success: false, error: 'Supabase is not configured' };
    if (!factorId) return { success: false, error: 'Missing MFA factor' };
    if (!code?.trim()) return { success: false, error: 'Enter the 6-digit code' };

    const mfaApi = (supabase.auth as any)?.mfa;
    if (!mfaApi) return { success: false, error: 'MFA is not supported by this auth client' };

    setMfaLoading(true);
    try {
      if (typeof mfaApi.challengeAndVerify === 'function') {
        const { error } = await mfaApi.challengeAndVerify({
          factorId,
          code: code.trim(),
        });
        if (error) return { success: false, error: error.message || 'Invalid verification code' };
      } else {
        if (typeof mfaApi.challenge !== 'function' || typeof mfaApi.verify !== 'function') {
          return { success: false, error: 'MFA verification is not supported by this auth client' };
        }
        const { data: challengeData, error: challengeError } = await mfaApi.challenge({ factorId });
        if (challengeError || !challengeData?.id) {
          return { success: false, error: challengeError?.message || 'Could not issue challenge' };
        }
        const { error: verifyError } = await mfaApi.verify({
          factorId,
          challengeId: challengeData.id,
          code: code.trim(),
        });
        if (verifyError) return { success: false, error: verifyError.message || 'Invalid verification code' };
      }

      setMfaEnabled(true);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Could not verify 2FA code' };
    } finally {
      setMfaLoading(false);
    }
  }, []);

  const disableTwoFactor = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!supabaseConfigured) return { success: false, error: 'Supabase is not configured' };
    if (!user) return { success: false, error: 'You must be logged in' };

    const mfaApi = (supabase.auth as any)?.mfa;
    if (!mfaApi || typeof mfaApi.unenroll !== 'function' || typeof mfaApi.listFactors !== 'function') {
      return { success: false, error: 'MFA is not supported by this auth client' };
    }

    setMfaLoading(true);
    try {
      const { data, error } = await mfaApi.listFactors();
      if (error) return { success: false, error: error.message || 'Could not load factors' };
      const allFactors = [
        ...(Array.isArray(data?.all) ? data.all : []),
        ...(Array.isArray(data?.totp) ? data.totp : []),
      ];
      const verified = allFactors.find((f: any) => f?.status === 'verified');
      if (!verified?.id) {
        setMfaEnabled(false);
        return { success: true };
      }

      const { error: unenrollError } = await mfaApi.unenroll({ factorId: verified.id });
      if (unenrollError) return { success: false, error: unenrollError.message || 'Could not disable 2FA' };

      setMfaEnabled(false);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Could not disable 2FA' };
    } finally {
      setMfaLoading(false);
    }
  }, [user]);

  const login = useCallback(async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🔐 Login attempt for:', credentials.email);
      setIsLoading(true);

      if (supabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email.trim().toLowerCase(),
          password: credentials.password,
        });
        if (error || !data.user) {
          const msg = error?.message || 'Invalid email or password';
          console.warn('Supabase login failed:', msg);
          const friendly = /invalid login credentials/i.test(msg)
            ? 'Invalid email or password'
            : msg;
          return { success: false, error: friendly };
        }
        const meta = data.user.user_metadata || {};
        const firstName: string = meta.firstName || '';
        const lastName: string = meta.lastName || '';
        const displayName: string = meta.name || [firstName, lastName].filter(Boolean).join(' ') || String(data.user.email).split('@')[0];
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email || credentials.email,
          name: displayName,
          avatar: meta.avatar_url || meta.picture,
          isAuthenticated: true,
        };
        setIsGuest(false);
        setUser(authUser);
        setSupabaseUser(data.user);
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
        try {
          await migrateLocalDataToSupabaseUser(authUser.email, data.user.id);
        } catch (migrationError) {
          console.warn('Local->Supabase migration skipped (login):', migrationError);
        }
        try {
          const newSync = new SupabaseUserSync(data.user.id);
          setSupabaseSync(newSync);
          setAutoSyncEnabled(true);
          void setSyncUserId(data.user.id);
        } catch (syncError) {
          console.log('Supabase sync setup skipped:', syncError);
        }
        console.log('✅ Supabase login successful');
        return { success: true };
      }

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
        setSupabaseSync(newSync);
        setAutoSyncEnabled(true);
        void setSyncUserId(foundUser.id);
      } catch (syncError) {
        console.log('Supabase sync setup skipped:', syncError);
      }
      console.log('Login successful (local)');
      return { success: true };
    } catch (error: any) {
      // warn: handled failure; console.error triggers dev LogBox over the whole app
      console.warn('Login failed:', error?.message ?? error);
      const networkMsg = friendlyMessageForAuthNetworkError(error);
      if (networkMsg && typeof __DEV__ !== "undefined" && __DEV__) {
        console.warn(
          "Email/password sign-in uses Supabase (EXPO_PUBLIC_SUPABASE_URL). It does not use your computer's local Metro server. If this is new, check Wi-Fi in the simulator, or restart Expo with --clear after changing .env.",
        );
      }
      return { success: false, error: networkMsg || error?.message || 'Login failed' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(async (credentials: SignupCredentials): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      if (credentials.password.length < 6) {
        return { success: false, error: 'Password should be at least 6 characters' };
      }
      const displayName = `${credentials.firstName} ${credentials.lastName}`.trim();

      if (supabaseConfigured) {
        const { data, error } = await supabase.auth.signUp({
          email: credentials.email.trim().toLowerCase(),
          password: credentials.password,
          options: {
            data: {
              firstName: credentials.firstName,
              lastName: credentials.lastName,
              name: displayName,
              full_name: displayName,
            },
          },
        });
        if (error || !data.user) {
          const msg = error?.message || 'Signup failed';
          console.warn('Supabase signup failed:', msg);
          const networkFriendly =
            error != null ? friendlyMessageForAuthNetworkError(error) : friendlyMessageForAuthNetworkError(new Error(msg));
          const friendly = /already registered|already exists/i.test(msg)
            ? 'An account with this email already exists'
            : networkFriendly || msg;
          return { success: false, error: friendly };
        }
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email || credentials.email,
          name: displayName,
          isAuthenticated: true,
        };
        setIsGuest(false);
        setUser(authUser);
        setSupabaseUser(data.user);
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
        try {
          const newSync = new SupabaseUserSync(data.user.id);
          setSupabaseSync(newSync);
          setAutoSyncEnabled(true);
          void setSyncUserId(data.user.id);
        } catch (syncError) {
          console.log('Supabase sync setup skipped on signup:', syncError);
        }
        if (!data.session) {
          console.log('✅ Supabase signup requires email confirmation');
          return { success: true, error: 'Check your email to confirm your account before signing in.' };
        }
        console.log('✅ Supabase signup successful:', authUser.email);
        return { success: true };
      }

      const users = await getUsersDb();
      const existingUser = users.find(u => u.email.toLowerCase() === credentials.email.toLowerCase());
      if (existingUser) {
        return { success: false, error: 'An account with this email already exists' };
      }
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
      try {
        const newSync = new SupabaseUserSync(newUser.id);
        setSupabaseSync(newSync);
        setAutoSyncEnabled(true);
        void setSyncUserId(newUser.id);
      } catch (syncError) {
        console.log('Supabase sync setup skipped on signup:', syncError);
      }
      console.log('✅ Signup successful (local):', authUser.email);
      return { success: true };
    } catch (error: any) {
      // warn: handled failure; console.error triggers dev LogBox over the whole app
      console.warn('Signup failed:', error?.message ?? error);
      const networkMsg = friendlyMessageForAuthNetworkError(error);
      if (networkMsg && typeof __DEV__ !== "undefined" && __DEV__) {
        console.warn(
          "Sign-up uses Supabase (EXPO_PUBLIC_SUPABASE_URL). Check simulator Wi‑Fi, VPN/firewall, or restart Expo with --clear after changing .env.",
        );
      }
      return { success: false, error: networkMsg || error?.message || 'Signup failed' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (supabaseSync) {
        supabaseSync.cleanup();
        setSupabaseSync(null);
      }
      setAutoSyncEnabled(false);
      if (supabaseConfigured) {
        try {
          await supabase.auth.signOut();
        } catch (e) {
          console.log('Supabase signOut failed:', e);
        }
      }
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
      setSupabaseUser(null);
      setIsGuest(false);
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('💥 Logout error:', error);
    }
  }, [supabaseSync]);

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

  const getSupabaseSync = useCallback(() => supabaseSync, [supabaseSync]);
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

  const loginWithGoogleOAuth = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!supabaseConfigured) {
        return { success: false, error: 'Supabase is not configured' };
      }
      setIsLoading(true);

      const redirectTo = AuthSession.makeRedirectUri({ scheme: 'onepager', path: 'auth' });
      console.log('🔗 Supabase Google redirectTo:', redirectTo);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });
      if (error || !data?.url) {
        return { success: false, error: error?.message || 'Failed to start Google sign-in' };
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success' || !result.url) {
        if (result.type === 'cancel' || result.type === 'dismiss') {
          return { success: false, error: 'Cancelled' };
        }
        return { success: false, error: 'Google sign-in failed' };
      }

      const parsed = Linking.parse(result.url);
      const params: Record<string, string | undefined> = {
        ...(parsed.queryParams as any),
      };
      const hashIndex = result.url.indexOf('#');
      if (hashIndex >= 0) {
        const hash = result.url.substring(hashIndex + 1);
        const hashParams = new URLSearchParams(hash);
        hashParams.forEach((v, k) => {
          if (!params[k]) params[k] = v;
        });
      }

      const access_token = params.access_token;
      const refresh_token = params.refresh_token;
      const code = params.code;

      if (access_token && refresh_token) {
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (sessionError || !sessionData.user) {
          return { success: false, error: sessionError?.message || 'Failed to set session' };
        }
        console.log('✅ Supabase Google OAuth successful (implicit)');
        return { success: true };
      }

      if (code) {
        const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
        if (sessionError || !sessionData.user) {
          return { success: false, error: sessionError?.message || 'Failed to exchange code' };
        }
        console.log('✅ Supabase Google OAuth successful (PKCE)');
        return { success: true };
      }

      return { success: false, error: 'No session returned from Google' };
    } catch (error: any) {
      console.error('💥 Google OAuth error:', error);
      return { success: false, error: error?.message || 'Google sign-in failed. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async (
    googleUser: { id: string; email: string; name: string; picture?: string; idToken?: string; nonce?: string }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🔐 Google login attempt for:', googleUser.email);
      setIsLoading(true);

      if (supabaseConfigured && googleUser.idToken) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: googleUser.idToken,
          nonce: googleUser.nonce,
        });
        if (error || !data.user) {
          const msg = error?.message || 'Google sign-in failed';
          console.warn('Supabase signInWithIdToken failed:', msg);
          return { success: false, error: msg };
        }
        const supaUser = data.user;
        const meta = supaUser.user_metadata || {};
        const displayName: string =
          meta.name || meta.full_name || googleUser.name ||
          (supaUser.email ? String(supaUser.email).split('@')[0] : 'User');
        const authUser: AuthUser = {
          id: supaUser.id,
          email: supaUser.email || googleUser.email,
          name: displayName,
          avatar: meta.avatar_url || meta.picture || googleUser.picture,
          isAuthenticated: true,
        };
        setIsGuest(false);
        setUser(authUser);
        setSupabaseUser(supaUser);
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
        try {
          await migrateLocalDataToSupabaseUser(authUser.email, supaUser.id);
        } catch (migrationError) {
          console.warn('Local->Supabase migration skipped (google):', migrationError);
        }
        try {
          const newSync = new SupabaseUserSync(supaUser.id);
          setSupabaseSync(newSync);
          setAutoSyncEnabled(true);
          void setSyncUserId(supaUser.id);
        } catch (syncError) {
          console.log('Supabase sync setup skipped:', syncError);
        }
        console.log('✅ Supabase Google login successful');
        return { success: true };
      }

      console.log('⚠️ Falling back to local Google user (no id_token or Supabase not configured)');
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
        console.log('✅ New Google user created (local):', googleUser.email);
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
        setSupabaseSync(newSync);
        setAutoSyncEnabled(true);
        void setSyncUserId(foundUser.id);
      } catch (syncError) {
        console.log('Supabase sync setup skipped:', syncError);
      }

      console.log('Google login successful (local)');
      return { success: true };
    } catch (error: any) {
      console.error('💥 Google login error:', error);
      return { success: false, error: error?.message || 'Google sign-in failed. Please try again.' };
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
    isConfigured: supabaseConfigured || !!GOOGLE_CLIENT_ID,
    useSupabaseOAuth: supabaseConfigured,
  }), []);

  const mfa = useMemo(() => ({
    isSupported: supabaseConfigured && Platform.OS !== 'web',
    isEnabled: mfaEnabled,
    isLoading: mfaLoading,
    refreshStatus: refreshMfaStatus,
    startSetup: startTwoFactorSetup,
    verifySetup: verifyTwoFactorSetup,
    disable: disableTwoFactor,
  }), [mfaEnabled, mfaLoading, refreshMfaStatus, startTwoFactorSetup, verifyTwoFactorSetup, disableTwoFactor]);

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
    loginWithGoogleOAuth,
    continueAsGuest,
    convertGuestToUser,
    updateUser,
    deleteAccount,
    createDemoUser,
    clearAllData,
    getSupabaseSync,
    getFirebaseSync: getSupabaseSync,
    isAutoSyncEnabled,
    supabaseUser,
    firebaseUser: supabaseUser,
    biometricAuth,
    googleAuthConfig,
    mfa,
  }), [user, isLoading, isInitialized, isGuest, login, signup, logout, loginWithGoogle, loginWithGoogleOAuth, continueAsGuest, convertGuestToUser, updateUser, deleteAccount, createDemoUser, clearAllData, getSupabaseSync, isAutoSyncEnabled, supabaseUser, biometricAuth, googleAuthConfig, mfa]);
});
