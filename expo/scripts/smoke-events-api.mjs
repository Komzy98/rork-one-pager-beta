#!/usr/bin/env node
/**
 * Smoke-test merged events API (Ticketmaster + Skiddle).
 *
 * Usage:
 *   node scripts/smoke-events-api.mjs
 *   EVENTS_API_BASE_URL=https://your-api.railway.app node scripts/smoke-events-api.mjs
 */

import { config } from 'dotenv';

config();

const base = (process.env.EVENTS_API_BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
const minEvents = Number(process.env.EVENTS_SMOKE_MIN_TOTAL ?? 1);

const input = encodeURIComponent(
  JSON.stringify({
    latitude: 51.5074,
    longitude: -0.1278,
    radiusMiles: 25,
    size: 20,
  }),
);

const url = `${base}/api/trpc/events.getNearby?input=${input}`;

const res = await fetch(url);
const body = await res.json().catch(async () => {
  const text = await res.text();
  throw new Error(`Non-JSON (${res.status}): ${text.slice(0, 200)}`);
});

if (!res.ok) {
  console.error('HTTP', res.status, body);
  process.exit(1);
}

const result = body?.result?.data;
if (!result) {
  console.error('Unexpected tRPC shape:', JSON.stringify(body).slice(0, 400));
  process.exit(1);
}

const skiddle = result.events.filter((e) => e.id.startsWith('sk-')).length;
const ticketmaster = result.events.filter((e) => e.id.startsWith('tm-')).length;

console.log('Events smoke OK');
console.log('  source:', result.source);
console.log('  total:', result.events.length);
console.log('  skiddle:', skiddle);
console.log('  ticketmaster:', ticketmaster);

if (result.events.length < minEvents) {
  console.error(`Expected at least ${minEvents} events`);
  process.exit(1);
}

if (result.source === 'none') {
  console.error('No provider returned events — check TICKETMASTER_API_KEY / SKIDDLE_API_KEY on server');
  process.exit(1);
}
