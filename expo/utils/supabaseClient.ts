// Required for @supabase/supabase-js on React Native / Hermes (avoids broken URL → "Network request failed").
import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { fetch as expoFetch } from 'expo/fetch';

type PublicSupabaseExtra = { url?: string; anonKey?: string };

function readPublicSupabaseFromExtra(): PublicSupabaseExtra {
  const extra = Constants.expoConfig?.extra as { publicSupabase?: PublicSupabaseExtra } | undefined;
  return extra?.publicSupabase ?? {};
}

const fromEnv = {
  url: (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim(),
  key: (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim(),
};
const fromExtra = readPublicSupabaseFromExtra();
const rawUrl = fromEnv.url || (fromExtra.url || '').trim();
const rawKey = fromEnv.key || (fromExtra.anonKey || '').trim();

function isValidSupabaseUrl(u: string): boolean {
  if (!u) return false;
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    const host = parsed.hostname.toLowerCase();
    if (host === 'supabase.com' || host === 'www.supabase.com' || host === 'app.supabase.com') {
      return false;
    }
    if (!host.endsWith('.supabase.co') && !host.endsWith('.supabase.in') && !host.endsWith('.supabase.net')) {
      return false;
    }
    if (parsed.pathname && parsed.pathname !== '/' && parsed.pathname !== '') return false;
    return true;
  } catch {
    return false;
  }
}

function normalizeSupabaseUrl(u: string): string {
  if (!u) return '';
  try {
    const parsed = new URL(u);
    return `${parsed.protocol}//${parsed.hostname}`;
  } catch {
    return '';
  }
}

export const supabaseUrl = isValidSupabaseUrl(rawUrl) ? normalizeSupabaseUrl(rawUrl) : '';
export const supabaseAnonKey = rawKey;

export const supabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

function requestInputToUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  if (typeof Request !== 'undefined' && input instanceof Request) return input.url;
  return String(input);
}

function isLikelyTransientNetworkFailure(e: unknown): boolean {
  return /network request failed|failed to fetch|load failed|network connection was lost|timed out|ECONNRESET|ETIMEDOUT/i.test(
    String((e as Error)?.message ?? e),
  );
}

/**
 * RN `fetch` can throw once on Simulator HTTPS; retry then fall back to Expo's native HTTP client.
 */
function createSupabaseFetch(): typeof fetch {
  if (Platform.OS === 'web') {
    return fetch;
  }

  const resilientFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = requestInputToUrl(input);
    let lastNativeErr: unknown;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await fetch(url, init);
      } catch (e) {
        lastNativeErr = e;
        if (!isLikelyTransientNetworkFailure(e)) {
          throw e;
        }
        await new Promise<void>((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }

    try {
      return (await expoFetch(url, init as Parameters<typeof expoFetch>[1])) as unknown as Response;
    } catch {
      throw lastNativeErr instanceof Error ? lastNativeErr : new Error(String(lastNativeErr));
    }
  };

  return resilientFetch as typeof fetch;
}

function createStubClient(): SupabaseClient {
  const notConfigured = () => {
    console.warn('Supabase is not configured - operation skipped');
    return Promise.resolve({ data: null, error: new Error('Supabase not configured') });
  };

  const queryBuilder: any = {
    select: () => queryBuilder,
    insert: () => queryBuilder,
    update: () => queryBuilder,
    upsert: () => queryBuilder,
    delete: () => queryBuilder,
    eq: () => queryBuilder,
    neq: () => queryBuilder,
    gt: () => queryBuilder,
    lt: () => queryBuilder,
    gte: () => queryBuilder,
    lte: () => queryBuilder,
    like: () => queryBuilder,
    ilike: () => queryBuilder,
    is: () => queryBuilder,
    in: () => queryBuilder,
    order: () => queryBuilder,
    limit: () => queryBuilder,
    single: () => notConfigured(),
    maybeSingle: () => notConfigured(),
    then: (resolve: any) => resolve({ data: null, error: new Error('Supabase not configured') }),
  };

  const channelStub: any = {
    on: () => channelStub,
    subscribe: () => channelStub,
    unsubscribe: () => Promise.resolve('ok'),
  };

  const stub: any = {
    from: () => queryBuilder,
    channel: () => channelStub,
    removeChannel: () => Promise.resolve('ok'),
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: notConfigured,
      signUp: notConfigured,
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  };

  return stub as SupabaseClient;
}

function safeCreateClient(): SupabaseClient {
  try {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: Platform.OS === 'web' ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      global: {
        fetch: createSupabaseFetch(),
      },
    });
  } catch (err) {
    console.warn('Failed to init Supabase client, falling back to stub:', err);
    return createStubClient();
  }
}

export const supabase: SupabaseClient = supabaseConfigured
  ? safeCreateClient()
  : createStubClient();

if (supabaseConfigured) {
  console.log('Supabase client initialized');
} else {
  if (!rawUrl && !rawKey) {
    console.warn('Supabase env vars missing - cloud sync disabled, using local storage only');
  } else if (!isValidSupabaseUrl(rawUrl)) {
    console.warn(
      'EXPO_PUBLIC_SUPABASE_URL is invalid. Expected format: https://<project-ref>.supabase.co (NOT the dashboard URL). Got:',
      rawUrl
    );
  } else if (!rawKey) {
    console.warn('EXPO_PUBLIC_SUPABASE_ANON_KEY is missing');
  }
}
