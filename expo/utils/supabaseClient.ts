// Required for @supabase/supabase-js on React Native / Hermes (avoids broken URL → "Network request failed").
import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient, type Session, type User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

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

function isLikelyTransientNetworkFailure(e: unknown): boolean {
  return /network request failed|failed to fetch|load failed|network connection was lost|timed out|ECONNRESET|ETIMEDOUT/i.test(
    String((e as Error)?.message ?? e),
  );
}

/** RN fetch rejects `Headers` instances — flatten to a plain record. */
function flattenHeaders(headers?: HeadersInit): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headers) return out;

  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    headers.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }

  if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      if (value != null) out[key] = String(value);
    }
    return out;
  }

  for (const [key, value] of Object.entries(headers)) {
    if (value != null) out[key] = String(value);
  }
  return out;
}

function toFetchParams(
  input: RequestInfo | URL,
  init?: RequestInit,
): { url: string; init: RequestInit } {
  if (typeof input === 'string') {
    return { url: input, init: buildSafeInit(init) };
  }
  if (input instanceof URL) {
    return { url: input.href, init: buildSafeInit(init) };
  }
  if (typeof Request !== 'undefined' && input instanceof Request) {
    const headers = new Headers(input.headers);
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    const method = init?.method ?? input.method;
    const hasInitBody = init?.body !== undefined && init?.body !== null;
    return {
      url: input.url,
      init: buildSafeInit({
        method,
        headers,
        body: hasInitBody ? init.body : method === 'GET' || method === 'HEAD' ? undefined : input.body,
        signal: init?.signal ?? input.signal,
      }),
    };
  }
  return { url: String(input), init: buildSafeInit(init) };
}

function buildSafeInit(init?: RequestInit): RequestInit {
  const safe: RequestInit = {
    method: init?.method ?? 'GET',
    headers: flattenHeaders(init?.headers),
  };
  if (init?.body != null) safe.body = init.body;
  if (init?.signal) safe.signal = init.signal;
  return safe;
}

/** XMLHttpRequest fallback when RN `fetch` fails on HTTPS (common with Supabase + Headers). */
function fetchViaXhr(url: string, init: RequestInit): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.timeout = 45000;
    const method = (init.method ?? 'GET').toUpperCase();
    xhr.open(method, url, true);

    const headers = flattenHeaders(init.headers);
    Object.entries(headers).forEach(([key, value]) => {
      try {
        xhr.setRequestHeader(key, value);
      } catch {
        /* skip forbidden headers */
      }
    });

    xhr.onload = () => {
      const responseHeaders = new Headers();
      const raw = xhr.getAllResponseHeaders?.() ?? '';
      raw.split('\r\n').forEach((line) => {
        const idx = line.indexOf(':');
        if (idx > 0) {
          responseHeaders.set(line.slice(0, idx).trim(), line.slice(idx + 1).trim());
        }
      });
      resolve(
        new Response(xhr.responseText ?? '', {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: responseHeaders,
        }),
      );
    };
    xhr.onerror = () => reject(new TypeError('Network request failed'));
    xhr.ontimeout = () => reject(new TypeError('Network request timed out'));

    const body = init.body;
    if (body == null) {
      xhr.send();
    } else if (typeof body === 'string') {
      xhr.send(body);
    } else {
      xhr.send(null);
    }
  });
}

function createSupabaseFetch(): typeof fetch {
  if (Platform.OS === 'web') {
    return fetch;
  }

  const resilientFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const { url, init: safeInit } = toFetchParams(input, init);
    let lastErr: unknown;

    const strategies: Array<() => Promise<Response>> = [
      () => fetch(url, safeInit),
      () => fetchViaXhr(url, safeInit),
    ];

    for (const strategy of strategies) {
      for (let retry = 0; retry < 2; retry++) {
        try {
          return await strategy();
        } catch (e) {
          lastErr = e;
          if (!isLikelyTransientNetworkFailure(e)) break;
          await new Promise<void>((r) => setTimeout(r, 350 * (retry + 1)));
        }
      }
    }

    if (typeof __DEV__ !== 'undefined' && __DEV__ && lastErr) {
      try {
        console.warn('[Supabase fetch] Failed for', new URL(url).hostname, (lastErr as Error)?.message);
      } catch {
        /* ignore */
      }
    }

    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  };

  return resilientFetch as typeof fetch;
}

type PasswordGrantJson = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  user?: User;
  msg?: string;
  error_description?: string;
  error_code?: string;
};

export type DirectAuthResult = {
  data: { user: User; session: Session | null } | null;
  error: Error | null;
};

const supabaseAuthHeaders = (): Record<string, string> => ({
  'Content-Type': 'application/json',
  apikey: supabaseAnonKey,
  Authorization: `Bearer ${supabaseAnonKey}`,
});

function sessionFromGrant(json: PasswordGrantJson): Session | null {
  if (!json.access_token || !json.refresh_token || !json.user) return null;
  const expiresIn = json.expires_in ?? 3600;
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_in: expiresIn,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    token_type: json.token_type ?? 'bearer',
    user: json.user,
  };
}

async function postSupabaseAuth(path: string, body: object): Promise<{ ok: boolean; status: number; json: PasswordGrantJson }> {
  const http = createSupabaseFetch();
  const res = await http(`${supabaseUrl}${path}`, {
    method: 'POST',
    headers: supabaseAuthHeaders(),
    body: JSON.stringify(body),
  });
  let json: PasswordGrantJson = {};
  try {
    json = (await res.json()) as PasswordGrantJson;
  } catch {
    json = {};
  }
  return { ok: res.ok, status: res.status, json };
}

/** Password sign-in via REST (bypasses SDK fetch quirks on React Native). */
export async function signInWithPasswordDirect(
  email: string,
  password: string,
): Promise<DirectAuthResult> {
  if (!supabaseConfigured) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  try {
    const { ok, status, json } = await postSupabaseAuth('/auth/v1/token?grant_type=password', {
      email: email.trim().toLowerCase(),
      password,
    });

    if (!ok) {
      const msg = json.msg || json.error_description || `HTTP ${status}`;
      return { data: null, error: new Error(msg) };
    }

    const session = sessionFromGrant(json);
    if (!session || !json.user) {
      return { data: null, error: new Error('Invalid auth response from server') };
    }

    return { data: { user: json.user, session }, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

/** Sign-up via REST (same transport as sign-in — reliable on React Native). */
export async function signUpDirect(
  email: string,
  password: string,
  metadata: Record<string, unknown>,
): Promise<DirectAuthResult> {
  if (!supabaseConfigured) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  try {
    const { ok, status, json } = await postSupabaseAuth('/auth/v1/signup', {
      email: email.trim().toLowerCase(),
      password,
      data: metadata,
    });

    if (!ok) {
      const msg = json.msg || json.error_description || `HTTP ${status}`;
      return { data: null, error: new Error(msg) };
    }

    if (!json.user) {
      return { data: null, error: new Error('Invalid signup response from server') };
    }

    return { data: { user: json.user, session: sessionFromGrant(json) }, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
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
  console.log('Supabase client initialized:', supabaseUrl.replace(/^https?:\/\//, '').slice(0, 40));
} else {
  if (!rawUrl && !rawKey) {
    console.warn('Supabase env vars missing - cloud sync disabled, using local storage only');
  } else if (!isValidSupabaseUrl(rawUrl)) {
    console.warn(
      'EXPO_PUBLIC_SUPABASE_URL is invalid. Expected format: https://<ref>.supabase.co (NOT the dashboard URL). Got:',
      rawUrl
    );
  } else if (!rawKey) {
    console.warn('EXPO_PUBLIC_SUPABASE_ANON_KEY is missing');
  }
}

export async function probeSupabaseConnectivity(): Promise<{ ok: boolean; detail: string }> {
  if (!supabaseConfigured) {
    return { ok: false, detail: 'Supabase is not configured' };
  }
  try {
    const http = createSupabaseFetch();
    const res = await http(`${supabaseUrl}/auth/v1/health`, {
      headers: { apikey: supabaseAnonKey },
    });
    return { ok: res.ok || res.status === 401, detail: `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, detail: (e as Error)?.message ?? String(e) };
  }
}
