import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import { ResponseType } from 'expo-auth-session';
import { AccessTokenRequest } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import {
  GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID,
  getGoogleOAuthRedirectUri,
  getGoogleSignInFailureMessage,
  isNativeBrandedGoogleSignInAvailable,
} from '@/utils/googleSignIn.shared';

export type GoogleSignInResult =
  | { ok: true; idToken: string; accessToken?: string }
  | { ok: false; error: string; cancelled?: boolean };

export {
  getGoogleIosUrlScheme,
  getGoogleOAuthRedirectUri,
  getGoogleSignInFailureMessage,
  isNativeBrandedGoogleSignInAvailable,
} from '@/utils/googleSignIn.shared';

let nativeGoogleConfigured = false;

/**
 * Minimal hand-written shape for the optional native module
 * `@react-native-google-signin/google-signin`. It is lazily required only in
 * native builds where the package is installed, so we avoid a hard type
 * dependency on it here (it is not part of package.json).
 */
interface GoogleSigninStatic {
  configure(options: {
    webClientId?: string;
    iosClientId?: string;
    offlineAccess?: boolean;
    scopes?: string[];
  }): void;
  hasPlayServices(options?: { showPlayServicesUpdateDialog?: boolean }): Promise<boolean>;
  signIn(): Promise<unknown>;
  getTokens(): Promise<{ idToken?: string; accessToken?: string }>;
}

interface GoogleSigninModule {
  GoogleSignin: GoogleSigninStatic;
  isErrorWithCode(error: unknown): error is { code: string };
  isSuccessResponse(response: unknown): response is { data: { idToken?: string | null } };
  statusCodes: {
    SIGN_IN_CANCELLED: string;
    IN_PROGRESS: string;
    PLAY_SERVICES_NOT_AVAILABLE: string;
  };
}

function loadGoogleSigninModule(): GoogleSigninModule | null {
  if (Platform.OS === 'web') return null;
  try {
    // Lazy load — must not run at app startup (useAuth imports shared helpers only).
    return require('@react-native-google-signin/google-signin') as GoogleSigninModule;
  } catch (error) {
    if (__DEV__) {
      console.warn('[GoogleSignIn] Native module unavailable:', error);
    }
    return null;
  }
}

function configureNativeGoogleSignIn(GoogleSignin: GoogleSigninModule['GoogleSignin']): void {
  if (nativeGoogleConfigured || Platform.OS === 'web' || !GOOGLE_WEB_CLIENT_ID) return;
  if (Platform.OS === 'ios' && !GOOGLE_IOS_CLIENT_ID) return;

  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: Platform.OS === 'ios' ? GOOGLE_IOS_CLIENT_ID : undefined,
    offlineAccess: false,
    scopes: ['openid', 'profile', 'email'],
  });
  nativeGoogleConfigured = true;
}

async function promptNativeGoogleSignIn(): Promise<GoogleSignInResult> {
  const native = loadGoogleSigninModule();
  if (!native) {
    return { ok: false, error: 'Native Google Sign-In is not available in this build.' };
  }

  const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } = native;

  if (Platform.OS === 'ios' && !GOOGLE_IOS_CLIENT_ID) {
    return {
      ok: false,
      error: 'Missing EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID. Restart Metro after updating .env.',
    };
  }

  configureNativeGoogleSignIn(GoogleSignin);

  try {
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }

    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) {
      return { ok: false, error: 'Cancelled', cancelled: true };
    }

    let idToken = response.data.idToken ?? undefined;
    if (!idToken) {
      const tokens = await GoogleSignin.getTokens();
      idToken = tokens.idToken;
    }
    if (!idToken) {
      return { ok: false, error: 'Google did not return an ID token' };
    }

    return { ok: true, idToken };
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return { ok: false, error: 'Cancelled', cancelled: true };
      }
      if (error.code === statusCodes.IN_PROGRESS) {
        return { ok: false, error: 'Google sign-in already in progress' };
      }
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return { ok: false, error: 'Google Play Services is not available' };
      }
    }
    const message = error instanceof Error ? error.message : 'Google sign-in failed';
    return { ok: false, error: getGoogleSignInFailureMessage(message) };
  }
}

async function promptWebGoogleSignIn(): Promise<GoogleSignInResult> {
  if (!GOOGLE_WEB_CLIENT_ID) {
    return { ok: false, error: 'Google client id not configured' };
  }

  const redirectUri = getGoogleOAuthRedirectUri();
  const request = new AuthSession.AuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    redirectUri,
    responseType: ResponseType.Code,
    usePKCE: true,
    scopes: ['openid', 'profile', 'email'],
  });

  const discovery = Google.discovery;
  await request.makeAuthUrlAsync(discovery);
  const result = await request.promptAsync(discovery);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { ok: false, error: 'Cancelled', cancelled: true };
  }
  if (result.type !== 'success' || !result.params.code) {
    const params = result.type === 'success' ? result.params : {};
    const oauthError =
      typeof params.error_description === 'string'
        ? params.error_description
        : typeof params.error === 'string'
          ? params.error
          : null;
    return { ok: false, error: oauthError || 'Google sign-in failed' };
  }

  try {
    const tokenResult = await new AccessTokenRequest({
      clientId: GOOGLE_WEB_CLIENT_ID,
      redirectUri,
      code: result.params.code,
      extraParams: {
        code_verifier: request.codeVerifier ?? '',
      },
    }).performAsync(discovery);

    const idToken = tokenResult.idToken ?? undefined;
    if (!idToken) {
      return { ok: false, error: 'Google did not return an ID token' };
    }

    return { ok: true, idToken, accessToken: tokenResult.accessToken };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token exchange failed';
    return { ok: false, error: message };
  }
}

/** Branded native sign-in on iOS/Android when enabled; browser OAuth otherwise. */
export async function promptGoogleSignIn(): Promise<GoogleSignInResult> {
  if (isNativeBrandedGoogleSignInAvailable()) {
    return promptNativeGoogleSignIn();
  }
  return promptWebGoogleSignIn();
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<{
  id: string;
  email: string;
  name?: string;
  picture?: string;
}> {
  const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!userInfoResponse.ok) {
    throw new Error('Failed to fetch Google user info');
  }
  return userInfoResponse.json();
}

export function decodeGoogleIdToken(idToken: string): {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
} {
  const payload = JSON.parse(
    decodeURIComponent(
      atob(idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    ),
  );
  return payload;
}

export async function resolveGoogleUserFromTokens(options: {
  idToken: string;
  accessToken?: string;
}): Promise<{ id: string; email: string; name?: string; picture?: string }> {
  if (options.accessToken) {
    return fetchGoogleUserInfo(options.accessToken);
  }
  const payload = decodeGoogleIdToken(options.idToken);
  return {
    id: payload.sub,
    email: payload.email || '',
    name: payload.name,
    picture: payload.picture,
  };
}
