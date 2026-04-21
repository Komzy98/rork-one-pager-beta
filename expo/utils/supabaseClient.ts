import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const rawUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
const rawKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();

function isValidSupabaseUrl(u: string): boolean {
  if (!u) return false;
  try {
    const parsed = new URL(u);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

const supabaseUrl = isValidSupabaseUrl(rawUrl) ? rawUrl : '';
const supabaseAnonKey = rawKey;

export const supabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

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
      'EXPO_PUBLIC_SUPABASE_URL is invalid. Expected format: https://<project-ref>.supabase.co. Got:',
      rawUrl
    );
  } else if (!rawKey) {
    console.warn('EXPO_PUBLIC_SUPABASE_ANON_KEY is missing');
  }
}
