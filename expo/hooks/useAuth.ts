import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import type { User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { AuthUser, LoginCredentials, SignupCredentials } from '@/types/habit';
import { SupabaseUserSync } from '@/utils/supabaseUserSync';
import { clearSyncUserId, setSyncUserId } from '@/utils/supabaseSync';
import {
  supabase,
  supabaseConfigured,
  supabaseUrl,
  signInWithPasswordDirect,
  signUpDirect,
  persistSupabaseSession,
  recoverSupabaseSession,
  restoreSupabaseSessionWithRetries,
} from '@/utils/supabaseClient';
import * as Linking from 'expo-linking';
import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';
import { getGoogleOAuthRedirectUri, isNativeBrandedGoogleSignInAvailable } from '@/utils/googleSignIn.shared';

import {
  migrateLocalDataToSupabaseUser,
  rememberGuestUserId,
  getLastGuestUserId,
} from '@/utils/localToSupabaseMigration';
import { resetYounifySession, setYounifyExternalUserId } from '@/services/younify';
import { purgeAccountSessionState } from '@/utils/accountIsolation';
import { likedContentService } from '@/utils/likedContentService';
import { episodeNotificationService } from '@/utils/episodeNotificationService';
import notificationService from '@/utils/notificationService';
import { seedDefaultUserProfile } from '@/utils/userProfileBootstrap';

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

function appendDevDetail(friendly: string, technical: string): string {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return friendly;
  const t = technical.trim();
  if (!t || t === friendly) return friendly;
  return `${friendly}\n(${t})`;
}

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

function isRetryableAuthNetworkMessage(message: string): boolean {
  return /network request failed|failed to fetch|load failed|network connection was lost|timed out|econnreset|etimedout/i.test(
    message,
  );
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

async function readCachedAuthUser(): Promise<AuthUser | null> {
  try {
    const cachedUser = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (!cachedUser) return null;
    return JSON.parse(cachedUser) as AuthUser;
  } catch {
    return null;
  }
}

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
  const resolveApiBaseUrl = useCallback((): string => {
    const envBase = (process.env.EXPO_PUBLIC_RORK_API_BASE_URL || '').trim();
    if (envBase.length > 0) {
      return envBase
        .replace(/\/+$/, '')
        .replace(/\/api\/trpc$/i, '')
        .replace(/\/trpc$/i, '');
    }
    const hostUri =
      Constants.expoConfig?.hostUri ??
      (Constants.expoGoConfig as { hostUri?: string } | null | undefined)?.hostUri;
    if (hostUri) {
      const [host] = hostUri.split('/');
      if (host) return `http://${host.replace(/\/+$/, '')}`;
    }
    return '';
  }, []);

  const deleteSupabaseAuthUser = useCallback(async (userId: string): Promise<{ success: boolean; error?: string }> => {
    if (!supabaseConfigured) return { success: true };
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (sessionError || !accessToken) {
      return { success: false, error: 'No active Supabase session found for secure account deletion.' };
    }

    const apiBaseUrl = resolveApiBaseUrl();
    if (!apiBaseUrl) {
      return {
        success: false,
        error: 'API base URL is not configured. Set EXPO_PUBLIC_RORK_API_BASE_URL to enable server-side account deletion.',
      };
    }

    try {
      const response = await fetch(`${apiBaseUrl}/auth/delete-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ userId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success !== true) {
        return { success: false, error: payload?.error || 'Server-side account deletion failed.' };
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Failed to reach secure deletion endpoint.' };
    }
  }, [resolveApiBaseUrl]);

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
  const authBootstrapDoneRef = useRef(false);
  const priorSignedInUserIdRef = useRef<string | null>(null);

  /** Purge caches + SDK state whenever the signed-in user id changes (including sign-out). */
  useEffect(() => {
    if (!isInitialized) return;
    const previous = priorSignedInUserIdRef.current;
    const next = user?.id ?? null;
    if (previous !== null && previous !== next) {
      void purgeAccountSessionState(next ? 'switch' : 'logout');
    }
    priorSignedInUserIdRef.current = next;
  }, [isInitialized, user?.id]);

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
    const activeUserId = user?.id;
    likedContentService.setActiveUser(activeUserId);
    episodeNotificationService.setActiveUser(activeUserId);
    notificationService.setActiveUser(activeUserId);
  }, [user?.id]);

  /** Isolate Younify `external_id` per app user and clear SDK state on sign-out (prevents linked streaming bleeding across accounts). */
  useEffect(() => {
    if (!isInitialized) return;
    if (user?.id) {
      setYounifyExternalUserId(user.id);
    } else {
      void resetYounifySession();
    }
  }, [isInitialized, user?.id]);

  const applySupabaseSession = useCallback(async (sessionUser: any) => {
    if (!sessionUser) return;
    await purgeAccountSessionState('sign_in');
    const meta = sessionUser.user_metadata || {};
    const firstName: string = meta.firstName || (meta.full_name ? String(meta.full_name).split(' ')[0] : '') || '';
    const lastName: string = meta.lastName || (meta.full_name ? String(meta.full_name).split(' ').slice(1).join(' ') : '') || '';
    const displayName: string = meta.name || meta.full_name || [firstName, lastName].filter(Boolean).join(' ') || (sessionUser.email ? String(sessionUser.email).split('@')[0] : 'User');
    if (sessionUser.email) {
      try {
        const guestUserId =
          user?.id?.startsWith('guest_') ? user.id : (await getLastGuestUserId()) ?? undefined;
        await migrateLocalDataToSupabaseUser(sessionUser.email, sessionUser.id, {
          sessionDisplayName: displayName,
          guestUserId,
        });
      } catch (migrationError) {
        console.warn('Local->Supabase migration skipped:', migrationError);
      }
    }
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
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        if (supabaseConfigured) {
          const session = await restoreSupabaseSessionWithRetries();
          if (session?.user && isMounted) {
            console.log('🔐 Restored Supabase session for:', session.user.email);
            await applySupabaseSession(session.user);
          } else {
            const parsedUser = await readCachedAuthUser();
            if (parsedUser && isMounted) {
              if (parsedUser.id?.startsWith('guest_')) {
                setUser(parsedUser);
                setIsGuest(true);
              } else if (parsedUser.isAuthenticated) {
                console.log(
                  '📱 Supabase session not ready yet — keeping cached sign-in for:',
                  parsedUser.email,
                );
                setUser(parsedUser);
                setIsGuest(false);
                try {
                  const newSync = new SupabaseUserSync(parsedUser.id);
                  setSupabaseSync(newSync);
                  setAutoSyncEnabled(true);
                  void setSyncUserId(parsedUser.id);
                } catch {
                  // sync waits until session refresh succeeds
                }
                void (async () => {
                  const recovered = await restoreSupabaseSessionWithRetries(5);
                  if (recovered?.user && isMounted) {
                    console.log('🔐 Background session refresh succeeded');
                    await applySupabaseSession(recovered.user);
                  }
                })();
              }
            }
          }
        } else {
          const parsedUser = await readCachedAuthUser();
          if (parsedUser && isMounted) {
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
        const parsedUser = await readCachedAuthUser();
        if (parsedUser?.isAuthenticated && isMounted) {
          setUser(parsedUser);
          setIsGuest(!!parsedUser.id?.startsWith('guest_'));
        }
      } finally {
        if (isMounted) {
          authBootstrapDoneRef.current = true;
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
            return;
          }

          if ((event as string) === 'TOKEN_REFRESH_FAILED') {
            void (async () => {
              const recovered = await recoverSupabaseSession();
              if (recovered?.user && isMounted) {
                console.log('🔐 Recovered session after token refresh failure');
                await applySupabaseSession(recovered.user);
              }
            })();
            return;
          }

          if (event === 'SIGNED_OUT') {
            if (!authBootstrapDoneRef.current) return;
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
  }, [applySupabaseSession]);

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
        const normalizedEmail = credentials.email.trim().toLowerCase();
        let authUserRecord: { user: { id: string; email?: string; user_metadata?: Record<string, unknown> }; session: { access_token: string; refresh_token: string } } | null = null;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt < 5; attempt++) {
          const direct = await signInWithPasswordDirect(normalizedEmail, credentials.password);
          if (direct.data?.user && direct.data.session) {
            authUserRecord = {
              user: direct.data.user,
              session: {
                access_token: direct.data.session.access_token,
                refresh_token: direct.data.session.refresh_token,
              },
            };
            lastError = null;
            break;
          }

          lastError = direct.error;
          const msg = direct.error?.message ?? '';
          if (!isRetryableAuthNetworkMessage(msg) || attempt >= 4) break;
          await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
        }

        if (!authUserRecord) {
          const msg = lastError?.message || 'Invalid email or password';
          console.warn('Supabase login failed:', msg);
          const networkFriendly = friendlyMessageForAuthNetworkError(lastError ?? new Error(msg));
          const friendly = /invalid login credentials/i.test(msg)
            ? 'Invalid email or password'
            : networkFriendly
              ? appendDevDetail(networkFriendly, msg)
              : msg;
          return { success: false, error: friendly };
        }

        try {
          const data = { user: authUserRecord.user };
          const meta = (data.user.user_metadata || {}) as Record<string, string | undefined>;
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

          await persistSupabaseSession(
            authUserRecord.session.access_token,
            authUserRecord.session.refresh_token,
            { user: authUserRecord.user as unknown as User },
          );

          try {
            const guestUserId =
              user?.id?.startsWith('guest_') ? user.id : (await getLastGuestUserId()) ?? undefined;
            await migrateLocalDataToSupabaseUser(authUser.email, data.user.id, {
              sessionDisplayName: authUser.name,
              guestUserId,
            });
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
        } catch (sessionErr) {
          console.warn('Login post-auth setup failed:', sessionErr);
          return { success: false, error: 'Signed in but could not finish setup. Please try again.' };
        }
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
      return {
        success: false,
        error:
          networkMsg != null
            ? appendDevDetail(networkMsg, String(error?.message ?? error))
            : error?.message || 'Login failed',
      };
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
        const normalizedEmail = credentials.email.trim().toLowerCase();
        const metadata = {
          firstName: credentials.firstName,
          lastName: credentials.lastName,
          name: displayName,
          full_name: displayName,
        };
        let signupUser: { id: string; email?: string } | null = null;
        let signupSession: { access_token: string; refresh_token: string } | null = null;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt < 3; attempt++) {
          const direct = await signUpDirect(normalizedEmail, credentials.password, metadata);
          if (direct.data?.user) {
            signupUser = direct.data.user;
            signupSession = direct.data.session
              ? {
                  access_token: direct.data.session.access_token,
                  refresh_token: direct.data.session.refresh_token,
                }
              : null;
            lastError = null;
            break;
          }
          lastError = direct.error;
          const msg = direct.error?.message ?? '';
          if (!isRetryableAuthNetworkMessage(msg) || attempt >= 2) break;
          await new Promise((r) => setTimeout(r, 450 * (attempt + 1)));
        }

        if (!signupUser) {
          const msg = lastError?.message || 'Signup failed';
          console.warn('Supabase signup failed:', msg);
          const networkFriendly = friendlyMessageForAuthNetworkError(lastError ?? new Error(msg));
          const friendly = /already registered|already exists|user already registered/i.test(msg)
            ? 'An account with this email already exists'
            : networkFriendly
              ? appendDevDetail(networkFriendly, msg)
              : msg;
          return { success: false, error: friendly };
        }

        if (signupSession) {
          await persistSupabaseSession(
            signupSession.access_token,
            signupSession.refresh_token,
            { user: signupUser as Parameters<typeof setSupabaseUser>[0] },
          );
        }

        const authUser: AuthUser = {
          id: signupUser.id,
          email: signupUser.email || credentials.email,
          name: displayName,
          isAuthenticated: true,
        };
        setIsGuest(false);
        setUser(authUser);
        setSupabaseUser(signupUser as Parameters<typeof setSupabaseUser>[0]);
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
        void seedDefaultUserProfile(authUser.id, authUser.email, authUser.name).catch((err) => {
          console.log('Profile seed on signup failed:', err);
        });
        try {
          const newSync = new SupabaseUserSync(signupUser.id);
          setSupabaseSync(newSync);
          setAutoSyncEnabled(true);
          void setSyncUserId(signupUser.id);
        } catch (syncError) {
          console.log('Supabase sync setup skipped on signup:', syncError);
        }
        if (!signupSession) {
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
      void seedDefaultUserProfile(authUser.id, authUser.email, authUser.name).catch((err) => {
        console.log('Profile seed on signup failed:', err);
      });
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
      return {
        success: false,
        error:
          networkMsg != null
            ? appendDevDetail(networkMsg, String(error?.message ?? error))
            : error?.message || 'Signup failed',
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const currentUserId = user?.id;
      await purgeAccountSessionState('logout');
      const scopedCalendarKeys = [
        `imported_calendars_${currentUserId || 'guest'}`,
        `selected_eventkit_calendars_${currentUserId || 'guest'}`,
        `eventkit_permissions_granted_${currentUserId || 'guest'}`,
      ];
      if (supabaseSync) {
        supabaseSync.cleanup();
        setSupabaseSync(null);
      }
      setAutoSyncEnabled(false);
      await clearSyncUserId();
      if (supabaseConfigured) {
        try {
          await supabase.auth.signOut();
        } catch (e) {
          console.log('Supabase signOut failed:', e);
        }
      }
      try {
        await AsyncStorage.multiRemove([
          AUTH_STORAGE_KEY,
          'biometric_enabled',
          'biometric_credentials',
          'imported_calendars',
          'selected_eventkit_calendars',
          'eventkit_permissions_granted',
          ...scopedCalendarKeys,
        ]);
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
  }, [supabaseSync, user?.id]);

  const continueAsGuest = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const guestUser: AuthUser = {
        id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: 'guest@example.com',
        name: 'Guest User',
        isAuthenticated: true
      };
      await rememberGuestUserId(guestUser.id);
      setUser(guestUser);
      setIsGuest(true);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(guestUser));
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
      const guestUserId = user?.id?.startsWith('guest_') ? user.id : await getLastGuestUserId();
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
      if (guestUserId) {
        try {
          await migrateLocalDataToSupabaseUser(authUser.email, authUser.id, {
            sessionDisplayName: authUser.name,
            guestUserId,
          });
        } catch (migrationError) {
          console.warn('Guest->local account migration skipped:', migrationError);
        }
      }
      setUser(authUser);
      setIsGuest(false);
      return { success: true };
    } catch (error) {
      console.error('💥 Convert guest error:', error);
      return { success: false, error: 'Failed to convert guest account' };
    }
  }, [isGuest, user?.id]);

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
      const currentUserId = user.id;
      if (supabaseConfigured) {
        const serverDelete = await deleteSupabaseAuthUser(currentUserId);
        if (!serverDelete.success) {
          return { success: false, error: serverDelete.error || 'Secure account deletion failed.' };
        }
      }
      await clearSyncUserId();
      if (supabaseSync) {
        supabaseSync.cleanup();
        setSupabaseSync(null);
      }
      setAutoSyncEnabled(false);
      if (supabaseConfigured) {
        try {
          await supabase.auth.signOut();
        } catch (e) {
          console.log('Supabase signOut failed during account deletion:', e);
        }
      }
      const users = await getUsersDb();
      await saveUsersDb(users.filter(u => u.id !== user.id));
      await AsyncStorage.multiRemove([
        AUTH_STORAGE_KEY,
        'biometric_enabled',
        'biometric_credentials',
        '@user_profile',
        `@user_profile_${currentUserId}`,
        `imported_calendars_${currentUserId}`,
        `selected_eventkit_calendars_${currentUserId}`,
        `eventkit_permissions_granted_${currentUserId}`,
      ]);
      setUser(null);
      setSupabaseUser(null);
      setIsGuest(false);
      return { success: true };
    } catch (error) {
      console.error('Delete account error:', error);
      return { success: false, error: 'Failed to delete account' };
    }
  }, [user, supabaseConfigured, supabaseSync, deleteSupabaseAuthUser]);

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

      const redirectTo = getGoogleOAuthRedirectUri();
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
        ...(parsed.queryParams as Record<string, string | undefined>),
      };
      const hashIndex = result.url.indexOf('#');
      if (hashIndex >= 0) {
        const hash = result.url.substring(hashIndex + 1);
        const hashParams = new URLSearchParams(hash);
        hashParams.forEach((v, k) => {
          if (!params[k]) params[k] = v;
        });
      }

      const oauthErr = params.error;
      if (oauthErr) {
        const desc = params.error_description?.replace(/\+/g, ' ');
        return {
          success: false,
          error: desc || oauthErr || 'Google sign-in was denied',
        };
      }

      const access_token = params.access_token;
      const refresh_token = params.refresh_token;
      const code = params.code;

      if (access_token && refresh_token) {
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        const sessionUser = sessionData.session?.user;
        if (sessionError || !sessionUser) {
          return { success: false, error: sessionError?.message || 'Failed to set session' };
        }
        await applySupabaseSession(sessionUser);
        console.log('✅ Supabase Google OAuth successful (implicit)');
        return { success: true };
      }

      if (code) {
        const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
        const sessionUser = sessionData.session?.user;
        if (sessionError || !sessionUser) {
          return { success: false, error: sessionError?.message || 'Failed to exchange code' };
        }
        await applySupabaseSession(sessionUser);
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
  }, [applySupabaseSession]);

  const loginWithGoogle = useCallback(async (
    googleUser: { id: string; email: string; name: string; picture?: string; idToken?: string; nonce?: string }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🔐 Google login attempt for:', googleUser.email);
      setIsLoading(true);

      if (supabaseConfigured && googleUser.idToken) {
        const signInPayload: {
          provider: 'google';
          token: string;
          nonce?: string;
        } = {
          provider: 'google',
          token: googleUser.idToken,
        };
        if (googleUser.nonce?.trim()) {
          signInPayload.nonce = googleUser.nonce.trim();
        }
        const { data, error } = await supabase.auth.signInWithIdToken(signInPayload);
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
          const guestUserId =
            user?.id?.startsWith('guest_') ? user.id : (await getLastGuestUserId()) ?? undefined;
          await migrateLocalDataToSupabaseUser(authUser.email, supaUser.id, {
            sessionDisplayName: authUser.name,
            guestUserId,
          });
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
    nativeBrandedSignIn: isNativeBrandedGoogleSignInAvailable(),
    // Supabase browser OAuth is the fallback when native branded sign-in is not configured.
    useSupabaseOAuth:
      supabaseConfigured &&
      !isNativeBrandedGoogleSignInAvailable() &&
      (Platform.OS !== 'web' || !GOOGLE_CLIENT_ID.trim()),
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
