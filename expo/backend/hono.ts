import { Hono } from "hono";
import type { Context } from "hono";
import { cors } from "hono/cors";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { generalRateLimiter, authRateLimiter } from "./middleware/rate-limiter";
import { payloadSizeLimiter, inputSanitizer } from "./middleware/sanitizer";

const app = new Hono();

app.use("*", cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.use("*", async (c, next) => {
  const url = new URL(c.req.url);
  console.log('👀 Request:', c.req.method, url.pathname);
  await next();
  console.log('👍 Response status:', c.res.status);
});

app.use("*", payloadSizeLimiter(100 * 1024));

app.use("*", inputSanitizer());

app.use("*", generalRateLimiter());

app.use("/auth/*", authRateLimiter());
app.use("/trpc/auth.*", authRateLimiter());

app.onError((err, c) => {
  console.error('🔥 Hono Error:', err);
  return c.json(
    {
      error: {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      },
    },
    500
  );
});

const handleTrpcRequest = (c: Context) => {
  if (c.req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
    onError: ({ error, path }) => {
      console.error(`❌ tRPC Error [${path}]:`, error);
      console.error(`❌ Error details:`, JSON.stringify(error, null, 2));
    },
  });
};

app.all("/trpc", (c) => handleTrpcRequest(c));
app.all("/trpc/*", (c) => handleTrpcRequest(c));

app.get("/", (c) => {
  return c.json({ status: "ok", message: "API is running" });
});



app.get("/test", (c) => {
  return c.json({ 
    status: "ok", 
    message: "Test endpoint working",
    timestamp: new Date().toISOString()
  });
});

app.get("/debug/env", (c) => {
  const apiKey = process.env.FOOTBALL_API_KEY;
  return c.json({ 
    footballApiKey: apiKey ? `configured (${apiKey.length} chars, starts with: ${apiKey.substring(0, 4)}...)` : 'NOT SET',
    nodeEnv: process.env.NODE_ENV || 'not set',
    timestamp: new Date().toISOString()
  });
});

const YOUNIFY_MANAGEMENT_BASE_URL =
  process.env.YOUNIFY_MANAGEMENT_BASE_URL || "https://api.younify.tv/v1";

const getYounifyApiKey = () =>
  process.env.YOUNIFY_MANAGEMENT_API_KEY || process.env.YOUNIFY_API_KEY;

app.post("/younify/create-user", async (c) => {
  const apiKey = getYounifyApiKey();
  if (!apiKey) {
    return c.json({ error: "YOUNIFY_API_KEY not configured" }, 500);
  }

  let body: any = {};
  try {
    body = await c.req.json();
  } catch {}

  const resolvedExternalId = body?.externalUserId || "one-pager-dev-user";
  const payload: Record<string, unknown> = {
    external_id: resolvedExternalId,
    properties: { source: "one-pager" },
  };
  if (body?.email) payload.email = body.email;
  if (body?.name) payload.name = body.name;

  try {
    const response = await fetch(`${YOUNIFY_MANAGEMENT_BASE_URL}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-mmt-api-secret": apiKey,
      },
      body: JSON.stringify(payload),
    });

    const data: any = await response.json().catch(() => ({}));
    let userId = data?.data?.id;
    let accessToken = data?.data?.access_token;
    let refreshToken = data?.data?.refresh_token;

    if (!response.ok && response.status === 422) {
      const usersResponse = await fetch(`${YOUNIFY_MANAGEMENT_BASE_URL}/users`, {
        headers: { "x-mmt-api-secret": apiKey },
      });
      const usersData: any = await usersResponse.json().catch(() => ({}));
      const existingUser = Array.isArray(usersData?.data)
        ? usersData.data.find((u: any) => u.external_id === resolvedExternalId)
        : null;
      if (existingUser?.id) userId = existingUser.id;
    } else if (!response.ok) {
      console.error("Younify create user failed:", { status: response.status, data });
      return c.json({ error: "Failed to create Younify user", details: data }, response.status as any);
    }

    if (userId && (!accessToken || !refreshToken)) {
      const tokenResponse = await fetch(
        `${YOUNIFY_MANAGEMENT_BASE_URL}/users/${userId}/tokens`,
        { method: "POST", headers: { "x-mmt-api-secret": apiKey } },
      );
      const tokenData: any = await tokenResponse.json().catch(() => ({}));
      if (!tokenResponse.ok) {
        return c.json({ error: "Failed to generate Younify tokens", details: tokenData }, tokenResponse.status as any);
      }
      accessToken = tokenData?.data?.access_token;
      refreshToken = tokenData?.data?.refresh_token;
    }

    if (!userId || !accessToken || !refreshToken) {
      return c.json({ error: "Younify response missing user tokens", details: data }, 502);
    }

    return c.json({ userId, accessToken, refreshToken });
  } catch (error: any) {
    console.error("Unexpected error in /younify/create-user:", error);
    return c.json({ error: "Internal server error", details: error?.message || String(error) }, 500);
  }
});

app.post("/younify/refresh-tokens", async (c) => {
  const apiKey = getYounifyApiKey();
  if (!apiKey) {
    return c.json({ error: "YOUNIFY_API_KEY not configured" }, 500);
  }

  let body: any = {};
  try {
    body = await c.req.json();
  } catch {}

  const userId = body?.userId;
  if (!userId) {
    return c.json({ error: "Missing userId" }, 400);
  }

  try {
    const response = await fetch(
      `${YOUNIFY_MANAGEMENT_BASE_URL}/users/${userId}/tokens`,
      { method: "POST", headers: { "x-mmt-api-secret": apiKey } },
    );
    const data: any = await response.json().catch(() => ({}));

    if (!response.ok) {
      return c.json({ error: "Failed to refresh Younify tokens", details: data }, response.status as any);
    }

    const accessToken = data?.data?.access_token;
    const refreshToken = data?.data?.refresh_token;
    if (!accessToken || !refreshToken) {
      return c.json({ error: "Younify token response missing tokens", details: data }, 502);
    }

    return c.json({ accessToken, refreshToken });
  } catch (error: any) {
    console.error("Unexpected error in /younify/refresh-tokens:", error);
    return c.json({ error: "Internal server error", details: error?.message || String(error) }, 500);
  }
});

app.get("/football/test", async (c) => {
  const apiKey = process.env.FOOTBALL_API_KEY;
  
  if (!apiKey) {
    return c.json({ 
      success: false,
      error: 'FOOTBALL_API_KEY not configured',
      hint: 'Check that the environment variable is set in Rork project settings'
    }, 500);
  }
  
  try {
    const response = await fetch('https://v3.football.api-sports.io/fixtures?live=all&league=39', {
      headers: { 'x-apisports-key': apiKey },
    });
    
    if (!response.ok) {
      const text = await response.text();
      return c.json({ success: false, status: response.status, error: text.substring(0, 200) });
    }
    
    const data = await response.json();
    return c.json({ 
      success: true,
      results: data.results || 0,
      fixtures: data.response?.length || 0,
      sample: data.response?.[0]?.teams || null
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;
