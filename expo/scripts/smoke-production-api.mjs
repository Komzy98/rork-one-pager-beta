#!/usr/bin/env node
/**
 * Post-deploy smoke: Railway API + TMDB (For You data).
 *
 * Usage:
 *   node scripts/smoke-production-api.mjs
 *   EVENTS_API_BASE_URL=https://join.onepagerapp.co.uk node scripts/smoke-production-api.mjs
 *
 * Exit 0 = all checks passed.
 */

import { config } from 'dotenv';

config();

const apiBase = (process.env.EVENTS_API_BASE_URL || process.env.PRODUCTION_API_BASE_URL || 'https://join.onepagerapp.co.uk').replace(/\/+$/, '');
const tmdbKey = process.env.TMDB_API_KEY || process.env.EXPO_PUBLIC_TMDB_API_KEY || '9c4ca7924ae21a581e065517c106f1cc';
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS ?? 25_000);

function trpcGetUrl(procedure, inputObj) {
  const input = encodeURIComponent(JSON.stringify(inputObj));
  return `${apiBase}/api/trpc/${procedure}?input=${input}`;
}

async function fetchJson(url, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const body = await res.json().catch(async () => {
      const text = await res.text();
      throw new Error(`${label}: non-JSON HTTP ${res.status}: ${text.slice(0, 200)}`);
    });
    if (!res.ok) {
      throw new Error(`${label}: HTTP ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

function assertTrpcData(body, label) {
  if (body?.error) {
    throw new Error(`${label}: tRPC error ${body.error.message ?? JSON.stringify(body.error)}`);
  }
  const data = body?.result?.data;
  if (data === undefined) {
    throw new Error(`${label}: missing result.data — ${JSON.stringify(body).slice(0, 300)}`);
  }
  return data;
}

const failures = [];

async function check(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`✗ ${name}: ${msg}`);
    failures.push(name);
  }
}

await check('health', async () => {
  const body = await fetchJson(`${apiBase}/health`, 'health');
  if (!body?.ok) throw new Error('health ok !== true');
});

await check('events.getNearby', async () => {
  const body = await fetchJson(
    trpcGetUrl('events.getNearby', {
      latitude: 53.48,
      longitude: -2.24,
      radiusMiles: 25,
      size: 5,
    }),
    'events.getNearby',
  );
  const data = assertTrpcData(body, 'events.getNearby');
  if (!Array.isArray(data.events)) throw new Error('events missing');
  if (data.source === 'none' && data.events.length === 0) {
    throw new Error('no events and source none — check provider API keys on server');
  }
});

await check('events.searchGlobal', async () => {
  const body = await fetchJson(
    trpcGetUrl('events.searchGlobal', {
      keyword: 'comedy',
      latitude: 53.48,
      longitude: -2.24,
      size: 5,
    }),
    'events.searchGlobal',
  );
  const data = assertTrpcData(body, 'events.searchGlobal');
  if (!Array.isArray(data.events)) throw new Error('events missing');
});

await check('tmdb.trending', async () => {
  const url = `https://api.themoviedb.org/3/trending/movie/week?api_key=${tmdbKey}`;
  const body = await fetchJson(url, 'tmdb.trending');
  if (!Array.isArray(body.results) || body.results.length === 0) {
    throw new Error('TMDB returned no trending movies');
  }
});

console.log('');
if (failures.length) {
  console.error(`Smoke failed (${failures.length}): ${failures.join(', ')}`);
  process.exit(1);
}
console.log(`All production smoke checks passed (${apiBase})`);
