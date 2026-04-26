import { Hono } from "hono";
import type { Context } from "hono";
import { cors } from "hono/cors";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { getFootballApiKeyFromEnv } from "./utils/footballApiKey";
import { generalRateLimiter, authRateLimiter } from "./middleware/rate-limiter";
import { payloadSizeLimiter, inputSanitizer } from "./middleware/sanitizer";
import younifyAuth from "./routes/younify-auth";

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

/** Client `lib/trpc` uses `/api/trpc`; keep `/trpc` for older callers. */
app.all("/api/trpc", (c) => handleTrpcRequest(c));
app.all("/api/trpc/*", (c) => handleTrpcRequest(c));
app.all("/trpc", (c) => handleTrpcRequest(c));
app.all("/trpc/*", (c) => handleTrpcRequest(c));

app.route("/api/younify", younifyAuth);
app.route("/younify", younifyAuth);

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
  const apiKey = getFootballApiKeyFromEnv();
  return c.json({ 
    footballApiKey: apiKey ? `configured (${apiKey.length} chars, starts with: ${apiKey.substring(0, 4)}...)` : 'NOT SET',
    nodeEnv: process.env.NODE_ENV || 'not set',
    timestamp: new Date().toISOString()
  });
});

app.get("/football/test", async (c) => {
  const apiKey = getFootballApiKeyFromEnv();
  
  if (!apiKey) {
    return c.json({ 
      success: false,
      error: 'Football API key not configured',
      hint: 'Set FOOTBALL_API_KEY or EXPO_PUBLIC_FOOTBALL_API_KEY for the API server process'
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
