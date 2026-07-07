#!/usr/bin/env node
/**
 * Smoke-test the football API (local or Railway).
 *
 * Usage:
 *   FOOTBALL_API_BASE_URL=https://your-api.railway.app node scripts/smoke-football-api.mjs
 *   node scripts/smoke-football-api.mjs   # defaults to http://127.0.0.1:3000
 *
 * Env:
 *   FOOTBALL_API_BASE_URL — API origin (no /api/trpc suffix)
 *   FOOTBALL_SMOKE_MIN_TOTAL — min live+upcoming fixtures (default 1)
 *   FOOTBALL_SMOKE_WAIT_MS — wait for server boot when checking /health (default 45000)
 */

const base = (process.env.FOOTBALL_API_BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
const minTotal = Number(process.env.FOOTBALL_SMOKE_MIN_TOTAL ?? 1);
const waitMs = Number(process.env.FOOTBALL_SMOKE_WAIT_MS ?? 45000);

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(path, options) {
  const url = `${base}${path}`;
  const res = await fetch(url, options);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`${path} returned non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  return { res, data };
}

async function waitForHealth() {
  const deadline = Date.now() + waitMs;
  let lastErr = 'unknown';
  while (Date.now() < deadline) {
    try {
      const { res, data } = await fetchJson('/health');
      if (res.ok && data.ok) return data;
      lastErr = `health ${res.status}: ${JSON.stringify(data)}`;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
    await sleep(500);
  }
  throw new Error(`API not healthy at ${base}/health after ${waitMs}ms — ${lastErr}`);
}

async function main() {
  console.log(`Football API smoke → ${base}`);

  await waitForHealth();
  console.log('✓ /health');

  const { res, data } = await fetchJson('/health/football');
  console.log('Football smoke result:', JSON.stringify(data, null, 2));

  if (!res.ok || !data.ok) {
    console.error('✗ Football smoke failed');
    process.exit(1);
  }

  const total = (data.upcoming ?? 0) + (data.live ?? 0);
  if (total < minTotal) {
    console.error(`✗ Expected at least ${minTotal} fixtures (live+upcoming), got ${total}`);
    process.exit(1);
  }

  console.log(`✓ /health/football — ${data.upcoming} upcoming, ${data.live} live`);
}

main().catch((err) => {
  console.error('Smoke test error:', err.message || err);
  process.exit(1);
});
