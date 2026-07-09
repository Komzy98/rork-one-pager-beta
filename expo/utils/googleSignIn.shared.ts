import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as AuthSession from 'expo-auth-session';
import { APP_SCHEME } from '@/utils/deepLinks';

function readEnv(name: string, extraKey: string): string {
  const fromEnv = process.env[name]?.trim();
  if (fromEnv) return fromEnv;
  const extra = Constants.expoConfig?.extra?.[extraKey];
  return typeof extra === 'string' ? extra.trim() : '';
}

export const GOOGLE_WEB_CLIENT_ID = readEnv('EXPO_PUBLIC_GOOGLE_CLIENT_ID', 'googleWebClientId');
export const GOOGLE_IOS_CLIENT_ID = readEnv('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID', 'googleIosClientId');
export const GOOGLE_ANDROID_CLIENT_ID = readEnv(
  'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID',
  'googleAndroidClientId',
);

/** Reversed iOS client id URL scheme for Expo config plugin, e.g. com.googleusercontent.apps.123-abc */
export function getGoogleIosUrlScheme(iosClientId: string): string | null {
  const trimmed = iosClientId.trim();
  if (!trimmed.endsWith('.apps.googleusercontent.com')) return null;
  const prefix = trimmed.replace(/\.apps\.googleusercontent\.com$/, '');
  return `com.googleusercontent.apps.${prefix}`;
}

/**
 * Native Google Sign-In disabled until a dedicated build validates URL schemes + pods.
 * Browser/Supabase OAuth matches the stable TestFlight path (build 62).
 */
export function isNativeBrandedGoogleSignInAvailable(): boolean {
  return false;
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
