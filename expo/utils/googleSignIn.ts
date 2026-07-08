import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as AuthSession from 'expo-auth-session';
import { ResponseType } from 'expo-auth-session';
import { AccessTokenRequest } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { APP_SCHEME } from '@/utils/deepLinks';

export type GoogleSignInResult =
  | { ok: true; idToken: string; accessToken?: string }
  | { ok: false; error: string; cancelled?: boolean };

function readEnv(name: string, extraKey: string): string {
  const fromEnv = process.env[name]?.trim();
  if (fromEnv) return fromEnv;
  const extra = Constants.expoConfig?.extra?.[extraKey];
  return typeof extra === 'string' ? extra.trim() : '';
}

const WEB_CLIENT_ID = readEnv('EXPO_PUBLIC_GOOGLE_CLIENT_ID', 'googleWebClientId');
const IOS_CLIENT_ID = readEnv('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID', 'googleIosClientId');
const ANDROID_CLIENT_ID = readEnv('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID', 'googleAndroidClientId');

let nativeGoogleConfigured = false;

/** Reversed iOS client id URL scheme for Expo config plugin, e.g. com.googleusercontent.apps.123-abc */
export function getGoogleIosUrlScheme(iosClientId: string): string | null {
  const trimmed = iosClientId.trim();
  if (!trimmed.endsWith('.apps.googleusercontent.com')) return null;
  const prefix = trimmed.replace(/\.apps\.googleusercontent\.com$/, '');
  return `com.googleusercontent.apps.${prefix}`;
}

/** Native SDK sign-in shows "One Pager" on Google (like Strava). Requires platform OAuth client ids. */
export function isNativeBrandedGoogleSignInAvailable(): boolean {
  if (Platform.OS === 'web' || !WEB_CLIENT_ID) return false;
  if (Platform.OS === 'ios') return !!IOS_CLIENT_ID;
  if (Platform.OS === 'android') return !!ANDROID_CLIENT_ID;
  return false;
}

export function configureNativeGoogleSignIn(): void {
  if (nativeGoogleConfigured || Platform.OS === 'web' || !WEB_CLIENT_ID) return;
  if (Platform.OS === 'ios' && !IOS_CLIENT_ID) return;

  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    iosClientId: Platform.OS === 'ios' ? IOS_CLIENT_ID : undefined,
    offlineAccess: false,
    scopes: ['openid', 'profile', 'email'],
  });
  nativeGoogleConfigured = true;
}

/** OAuth return URL for Supabase browser OAuth fallback. */
export function getGoogleOAuthRedirectUri(): string {
  if (Platform.OS === 'web') {
    return AuthSession.makeRedirectUri({ scheme: APP_SCHEME, path: 'auth' });
  }
  return `${APP_SCHEME}://auth`;
}

/** User-friendly message; iOS 18.4+ simulators often break Google OAuth in Safari. */
export function getGoogleSignInFailureMessage(error: string): string {
  if (/network connection|connection was lost|-1005|timed out|-1001/i.test(error)) {
    if (Platform.OS === 'ios' && !Device.isDevice) {
      return (
        'Google sign-in is broken on many iOS 18.4+ simulators (Apple bug). ' +
        'Try a physical iPhone, install an iOS 18.3 simulator in Xcode, or erase this simulator ' +
        '(Device → Erase All Content and Settings) and try once more.'
      );
    }
  }
  return error;
}

async function promptNativeGoogleSignIn(): Promise<GoogleSignInResult> {
  if (Platform.OS === 'ios' && !IOS_CLIENT_ID) {
    return {
      ok: false,
      error: 'Missing EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID. Restart Metro after updating .env.',
    };
  }

  configureNativeGoogleSignIn();

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
  if (!WEB_CLIENT_ID) {
    return { ok: false, error: 'Google client id not configured' };
  }

  const redirectUri = getGoogleOAuthRedirectUri();
  const request = new AuthSession.AuthRequest({
    clientId: WEB_CLIENT_ID,
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
      clientId: WEB_CLIENT_ID,
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

/** Branded native sign-in on iOS/Android; browser OAuth on web. */
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
