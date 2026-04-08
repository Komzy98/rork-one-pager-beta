import type { Context, Next } from "hono";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL = 60 * 1000;
let lastCleanup = Date.now();

function cleanupExpired() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

function getClientIP(c: Context): string {
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = c.req.header("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
  keyGenerator?: (c: Context) => string;
  message?: string;
}

export function rateLimiter(options: RateLimitOptions) {
  const {
    maxRequests,
    windowMs,
    keyPrefix = "global",
    keyGenerator,
    message = "Too many requests. Please try again later.",
  } = options;

  return async (c: Context, next: Next) => {
    cleanupExpired();

    const clientId = keyGenerator ? keyGenerator(c) : getClientIP(c);
    const key = `${keyPrefix}:${clientId}`;
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      rateLimitStore.set(key, entry);
    }

    entry.count++;

    const remaining = Math.max(0, maxRequests - entry.count);
    const resetSeconds = Math.ceil((entry.resetAt - now) / 1000);

    c.res.headers.set("X-RateLimit-Limit", String(maxRequests));
    c.res.headers.set("X-RateLimit-Remaining", String(remaining));
    c.res.headers.set("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > maxRequests) {
      console.log(`🚫 Rate limit exceeded for ${key} (${entry.count}/${maxRequests})`);
      return c.json(
        {
          error: {
            message,
            retryAfter: resetSeconds,
          },
        },
        429
      );
    }

    await next();
  };
}

export function authRateLimiter() {
  return rateLimiter({
    maxRequests: 5,
    windowMs: 10 * 60 * 1000,
    keyPrefix: "auth",
    message: "Too many authentication attempts. Please try again in 10 minutes.",
  });
}

export function generalRateLimiter() {
  return rateLimiter({
    maxRequests: 200,
    windowMs: 60 * 1000,
    keyPrefix: "general",
    message: "Too many requests. Please try again later.",
  });
}
